const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const database = require('./source/database_fns');
const uuid = require('./source/uuid');
const { publishDirectSMS } = require('./utils/aws_sns');
const { pool } = require('./source/database_fns');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Attach io to app so routes can access it
app.set('io', io);

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

io.on('connection', (socket) => {
  console.log('New client connected');
});

// Simple test route
app.get('/', (req, res) => {
  res.send('hi');
});

app.post('/new-entry', async (req, res) => {
  const customer_datas = req.body[0];
  const order_datas = req.body[1];

  const update = await database.update_new_customer_data(customer_datas, order_datas);

  if (!update) {
    res.status(400).send('something wrong');
  } else {
    res.status(200).send(update);
  }
});

app.get('/crates/:cratesID', async (req, res) => {
  const result = await database.get_crate_data(req.params.cratesID);
  if (!result) {
    res.status(400).send('cannot fetch data');
  } else {
    res.status(200).send(result);
  }
});

app.put('/orders', async (req, res) => {
  const { customer_id, status } = req.body;
  const result = await database.update_order_status(customer_id, status);

  if (!result) {
    return res.status(404).send('cannot update order data');
  }

  // Notify all clients that orders have been updated
  io.emit('order-status-updated');

  res.status(200).send('Updated orders data successfully');
});

app.put('/crates', async (req, res) => {
  const { crate_id, status } = req.body;
  const result = await database.update_crates_status(crate_id, status);

  if (!result) {
    res.status(400).send("cannot update crate status");
  } else {
    res.status(200).send('Updated crate status successfully');
  }
});

app.get('/orders', async (req, res) => {
  const { status } = req.query;

  if (!status) {
    return res.status(400).json({ error: 'Missing status query param' });
  }

  try {
    const orders = await database.getOrdersByStatus(status);
    res.status(200).json(orders);
  } catch (error) {
    console.error('Failed to fetch orders by status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/customer', async (req, res) => {
  const customerName = req.query.customerName;
  const page = req.query.page;
  const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : 10;

  const result = await database.getCustomers(customerName, page, limit);
  if (!result) {
    res.status(400).send("cannot fetch customer data");
  } else {
    res.status(200).send(result);
  }
});

app.delete('/customer', async (req, res) => {
  const { customer_id } = req.body;

  if (!customer_id) {
    return res.status(400).json({ message: 'Missing customerID in request body.' });
  }

  const result = await database.delete_customer(customer_id);

  if (result) {
    res.status(200).json({ message: 'Customer and related data deleted successfully.' });
  } else {
    res.status(500).json({ message: 'Failed to delete customer.' });
  }
});

app.put('/customer', async (req, res) => {
  const { customer_id, customerInfoChange = {}, orderInfoChange = {} } = req.body;

  if (!customer_id) {
    return res.status(400).json({ error: 'customer_id is required.' });
  }

  try {
    await database.updateCustomerData(customer_id, customerInfoChange, orderInfoChange);
    res.json({ message: 'Update successful' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

app.get('/crates', async (req, res) => {
  const { customer_id } = req.query;

  if (!customer_id) {
    return res.status(400).json({ error: 'Missing customer_id parameter' });
  }

  const crates = await database.get_crates_by_customer(customer_id);

  if (!crates) {
    return res.status(500).json({ error: 'Failed to fetch crates' });
  }

  res.json({ crates });
});

// single handler so we can mount both paths
const markDoneHandler = async (req, res) => {
  const { order_id } = req.params;
  const { comment = "" } = req.body || {};

  try {
    // Update order status + create BOX_* entries
    const result = await database.markOrderAsDone(order_id, comment);

    // (Optional) also recompute/return expected explicitly
    // const expected = await database.updateBoxesCountForOrder(order_id);

    // Notify clients
    const io = req.app.get('io');
    if (io) {
      io.emit("order-status-updated", { order_id, status: "processing complete" });
    }

    res.status(200).json({
      message: "Order marked as done",
      ...(result || {}) // includes boxes_count
      // expected, // if you used the explicit recompute above
    });
  } catch (error) {
    console.error(`[Order Done] Failed for order ${order_id}:`, error);
    res.status(500).json({
      error: "Failed to mark order as done",
      details: error.message
    });
  }
};

app.post('/orders/:order_id/done', markDoneHandler);
app.post('/orders/:order_id/mark-done', markDoneHandler); // alias


  app.put('/orders/:order_id', async (req, res) => {
    const { order_id } = req.params;
    const { weight_kg, estimated_pouches, estimated_boxes } = req.body;
  
    try {
      await database.updateOrderInfo(order_id, {
        weight_kg,
        estimated_pouches,
        estimated_boxes
      });
  
      res.status(200).json({ message: 'Order updated successfully' });
    } catch (error) {
      console.error('Failed to update order:', error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  });
  
  app.delete("/orders/:order_id", async (req, res) => {
    try {
      const { order_id } = req.params;
      await database.deleteOrder(order_id); 
      res.status(200).send({ message: "Order deleted" });
    } catch (err) {
      console.error("Failed to delete order:", err);
      res.status(500).send("Server error");
    }
  });
  
  app.get('/pallets', async (req, res) => {
    const { location } = req.query;
    if (!location) return res.status(400).json({ error: "Location is required" });
  
    try {
      const pallets = await database.getPalletsByLocation(location);
      res.json(pallets);
    } catch (err) {
      console.error("Failed to fetch pallets:", err);
      res.status(500).json({ error: "Failed to fetch pallets" });
    }
  });
  
  app.post('/pallets', async (req, res) => {
    const { location, capacity } = req.body;
    if (!location || !capacity) {
      return res.status(400).json({ error: "Location and capacity are required" });
    }
  
    try {
      const pallet_id = await database.createPallet(location, capacity);
      res.status(201).json({ message: "Pallet created", pallet_id });
    } catch (err) {
      console.error("Failed to create pallet:", err);
      res.status(500).json({ error: "Failed to create pallet" });
    }
  });
  
  app.delete('/pallets/:pallet_id', async (req, res) => {
    const { pallet_id } = req.params;
    try {
      const ok = await database.deletePallet(pallet_id);
      if (!ok) {
        return res.status(404).json({ error: 'Pallet not found' });
      }
      res.status(200).json({ message: 'Pallet deleted' });
    } catch (err) {
      console.error('Failed to delete pallet:', err);
      res.status(500).json({ error: 'Failed to delete pallet' });
    }
  });


  app.post('/orders/:order_id/ready', async (req, res) => {
    const { order_id } = req.params;
  
    try {
      await database.markOrderAsReady(order_id);
  
      const order = await database.getOrderById(order_id);
  
      const phone = order.phone
  
      if (phone) {
        await publishDirectSMS(
          phone,
          `Hi ${order.name}, your juice order is ready for pickup.`
        );
      }
  
      const io = req.app.get('io');
      io.emit("order-status-updated");
  
      res.status(200).json({ message: "Order marked as ready and customer notified." });
    } catch (error) {
      console.error("Failed to mark order as ready:", error);
      res.status(500).json({ error: "Failed to mark order as ready" });
    }
  });
  
  
  app.get("/orders/pickup", async (req, res) => {
    const { query } = req.query;
    console.log("Pickup query:", query); 
    try {
      const results = await database.searchOrdersWithShelfInfo(query);
      if (results.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.status(200).json(results);
    } catch (err) {
      console.error("Pickup search failed:", err);
      res.status(500).json({ error: "Failed to search pickup orders" });
    }
  });
  
  app.get("/orders/:order_id", async (req, res) => {
    try {
      const result = await database.getOrderById(req.params.order_id);
      if (!result) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.status(200).json(result);
    } catch (err) {
      console.error("Failed to fetch order by ID:", err);
      res.status(500).send("Server error");
    }
  });
  
  app.post('/orders/:order_id/pickup', async (req, res) => {
    const { order_id } = req.params;
  
    try {
      await database.markOrderAsPickedUp(order_id);
      res.status(200).json({ message: "Order marked as picked up" });
    } catch (err) {
      console.error("Failed to mark as picked up:", err);
      res.status(500).json({ error: "Pickup confirmation failed" });
    }
  });
  

  app.post('/pallets/:pallet_id/load-boxes', async (req, res) => {
    const { pallet_id } = req.params;
    const { boxes = [] } = req.body || {};
    try {
      const { assigned, holding } = await database.assignBoxesToPallet(pallet_id, boxes);
  
      // optional: broadcast so Pallet grids refresh in real time
      const io = req.app.get('io');
      if (io) io.emit('pallet-updated', { pallet_id, holding });
  
      res.json({ message: 'Boxes assigned to pallet', assigned, holding });
    } catch (e) {
      console.error('Error assigning boxes:', e);
      res.status(500).json({ error: 'Failed to assign boxes to pallet' });
    }
  });


  app.post('/pallets/assign-shelf', async (req, res) => {
    const { palletId, shelfId } = req.body || {};
    if (!palletId || !shelfId) {
      return res.status(400).json({ ok: false, error: 'palletId and shelfId are required' });
    }
  
    try {
      // 1) Link pallet to shelf (and whatever bookkeeping you already do there)
      const assignResult = await database.assignPalletToShelf(palletId, shelfId);
  
      // 2) Mark orders on that pallet as "Ready for pickup"
      let ready = { updated: 0, orderIds: [] };
      if (typeof database.markOrdersOnPalletReady === 'function') {
        ready = await database.markOrdersOnPalletReady(palletId);
      }
  
      // 3) Fetch customers who have boxes on this pallet
      let customers = [];
      if (typeof database.getCustomersByPalletId === 'function') {
        customers = await database.getCustomersByPalletId(palletId); // expect [{name, phone}, ...]
      }
  
      if (!Array.isArray(customers) || customers.length === 0) {
        return res.json({ ok: true, message: 'Assigned; no customers on this pallet', assignResult, ready, sms: [] });
      }
  
      // 4) Build a simple pickup location line (optional)
      let placeText = 'the store';
      if (typeof database.getShelfById === 'function') {
        try {
          const shelf = await database.getShelfById(shelfId);
          if (shelf) {
            placeText = shelf.shelf_name
              ? `${shelf.shelf_name}${shelf.location ? ` (${shelf.location})` : ''}`
              : (shelf.location || placeText);
          }
        } catch (_) {}
      }
  
      // 5) Send SMS directly (just like your test_sns.js)
      const results = [];
      for (const c of customers) {
        const phone = (c && c.phone) ? String(c.phone) : '';
        if (!phone) continue;
        const msg = `Hi ${c.name || 'there'}, your order is ready for pickup at ${placeText}.`;
        try {
          const messageId = await publishDirectSMS(phone, msg);
          console.log(`[assign-shelf] SMS OK -> ${phone} | ${messageId}`);
          results.push({ ok: true, phone, messageId });
        } catch (e) {
          console.warn(`[assign-shelf] SMS FAIL -> ${phone}: ${e.message}`);
          results.push({ ok: false, phone, error: e.message });
        }
      }
  
      return res.json({
        ok: true,
        message: 'Pallet assigned; orders ready; SMS attempted',
        assignResult,
        ready,
        notified: results.filter(r => r.ok).length,
        sms: results,
      });
    } catch (e) {
      console.error('assign-shelf failed:', e);
      return res.status(500).json({ ok: false, error: 'assign-shelf failed', details: e.message });
    }
  });
  
  app.get("/pallets/:pallet_id/customers", async (req, res) => {
    try {
      const rows = await database.getCustomersByPalletId(req.params.pallet_id);
      res.json(rows);
    } catch (e) {
      console.error("Failed to fetch customers by pallet:", e.message);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get('/pallets/:pallet_id/boxes', async (req, res) => {
    try {
      const rows = await database.getBoxesOnPallet(req.params.pallet_id);
      res.json(rows);
    } catch (e) {
      console.error('Failed to fetch boxes on pallet:', e);
      res.status(500).json({ error: 'Failed to fetch boxes on pallet' });
    }
  });

app.get('/locations', async (req, res) => {
  try {
    const locations = await database.getAllShelfLocations();
    res.json(locations);
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/shelves/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const shelves = await database.getShelvesByLocation(location);
    res.json(shelves);
  } catch (err) {
    console.error('Error fetching shelves:', err);
    res.status(500).json({ message: 'Error fetching shelves' });
  }
});

app.post('/api/shelves', async (req, res) => {
  try {
    const { location, capacity, shelf_name } = req.body;
    if (!location || capacity == null) {
      return res.status(400).json({ message: "Location and capacity are required" });
    }

    const shelf = await database.createShelf(location, capacity, shelf_name);
    res.status(201).json({ message: 'Shelf created', result: shelf });
  } catch (err) {
    console.error('❌ Error creating shelf:', err);
    res.status(500).json({ message: 'Error creating shelf', details: err.message });
  }
});

app.delete('/shelves/:shelf_id', async (req, res) => {
  const { shelf_id } = req.params;
  try {
    await database.deleteShelf(shelf_id);
    res.status(200).json({ message: 'Shelf deleted successfully' });
  } catch (err) {
    console.error('Error deleting shelf:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/cities', (req, res) => {
    res.json(["Lahti", "Kuopio", "Joensuu", "Mikkeli", "Varkaus", "Lapinlahti",]);
  });

app.get('/shelves/:shelf_id/contents', async (req, res) => {
    const { shelf_id } = req.params;
    try {
      const [pallet] = await pool.query(
        'SELECT * FROM Pallets WHERE shelf_id = ? LIMIT 1',
        [shelf_id]
      );
  
      if (!pallet.length) return res.status(404).json({ error: "No pallet on this shelf" });
  
      const [boxes] = await pool.query(
        'SELECT * FROM Boxes WHERE pallet_id = ?',
        [pallet[0].pallet_id]
      );
  
      res.status(200).json({
        pallet: pallet[0],
        boxes
      });
    } catch (err) {
      console.error('Error fetching shelf contents:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  app.get('/orders/:order_id/expected-boxes', async (req, res) => {
    try {
      // returns Orders.boxes_count; if 0, recomputes from Boxes and persists
      const expected = await database.updateBoxesCountForOrder(req.params.order_id);
      res.json({ expected });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch expected boxes' });
    }
  });
  

// First-box scan -> fetch order summary + all boxes for that order
app.get('/boxes/scan-info/:box_id', async (req, res) => {
  try {
    const data = await database.getScanInfoByBoxId(req.params.box_id);
    res.json(data);
  } catch (e) {
    console.error('scan-info error:', e.message);
    res.status(400).json({ error: e.message || 'Failed to fetch scan info' });
  }
});

  
// Start the HTTP server (not just Express)
server.listen(5001, () => {
  console.log("server is listening at port 5001!!");
});
