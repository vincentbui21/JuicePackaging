const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const database = require('./source/database_fns');
const uuid = require('./source/uuid');
const { publishDirectSMS } = require('./utils/aws_sns');
const fs = require('fs').promises;
const path = require('path');
const { printPouch } = require("./source/printers/videojet6330");
const net = require("net");

const settingsFilePath = path.join(__dirname, "default-setting.txt");


const app = express();
const server = http.createServer(app);
const pool = database.pool;
function emitActivity(type, message, extra = {}) {
  io.emit("activity", {
    type,         // "customer" | "processing" | "warehouse" | "ready" | "pickup"
    message,      // short text
    ts: new Date().toISOString(),
    ...extra,
  });
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Location-specific pickup SMS templates
// Usage: const smsText = buildPickupSMSText(locationString);
// If location is unknown, returns a sensible default.
// ─────────────────────────────────────────────────────────────────────────────
function buildPickupSMSText(locationRaw) {
  const l = (locationRaw || "").trim().toLowerCase();

  switch (l) {
    case "lapinlahti":
      return (
        "Hei, Mehunne ovat valmiina ja odottavat noutoanne, Anjan Pihaputiikki, Lapinlahti\n" +
        "puh. 044 073 3447\n" +
        "Avoinna. Maanantai-Perjantai 09-17, Lauantai 09-13"
      );

    case "kuopio":
      return (
        "Hei, Mehunne ovat valmiina ja odottavat noutoanne Mehustajalla. " +
        "Olemme avoinna Ma klo 8-17 ja Ti - Pe klo 9-17\n" +
        "Ystävällisin terveisin, Mehustajat"
      );

    case "lahti":
      return (
        "Hei, mehunne ovat valmiina noudettavaksi Vihertalo Varpulasta\n" +
        "Rajakatu 2, Lahti\n" +
        "Olemme avoinna Ma-Pe klo 10-18  ja La 9-15\n" +
        "Terveisin Mehustaja"
      );

    case "joensuu":
      return (
        "Hei, Mehunne ovat valmiina osoitteessa\n" +
        "Joensuu Nuorisoverstas\n" +
        "Tulliportinkatu 54\n" +
        "Mehut voi noutaa Ti ja To 9-14\n" +
        "puh: 050 4395406 Terveisin Mehustaja"
      );

    case "mikkeli":
      return (
        "Hei, Mehunne ovat valmiina ja odottavat noutoanne osoitteessa Nuorten Työpajat Mikkeli.\n" +
        "Noutopiste on avoinna Ma 09.30-14.00, Ti 8-16, Ke 8-16, To 09.30-14.00\n" +
        "Ystävällisin terveisin Mehustaja."
      );

    case "varkaus":
      return (
        "Hei, Mehunne ovat valmiina ja odottavat noutoanne osoitteessa XXX Varkaus, " +
        "paikka on sama jonne omanat on jätetty.\n" +
        "HUOM! Noutopiste on avoinna XXXXXX\n" +
        "Ystävällisin terveisin, Mehustaja"
      );

    default:
      // Generic fallback
      return "Hei! Mehunne ovat valmiina noudettavaksi. Ystävällisin terveisin, Mehustaja";
  }
}

// Small helper: try to pick a location string from known objects
function resolveLocationForSMS({ shelf, customers, fallback }) {
  // Priority: shelf.location → shelf.shelf_name → customer.city → fallback
  if (shelf && shelf.location) return shelf.location;
  if (shelf && shelf.shelf_name) return shelf.shelf_name;
  const c = Array.isArray(customers) ? customers.find(x => x && x.city) : null;
  if (c && c.city) return c.city;
  return fallback || "";
}

// Simple test route
app.get('/', (req, res) => {
  res.send('hi');
});

app.post('/new-entry', async (req, res) => {
  try {
    const customer_datas = req.body[0];
    const order_datas    = req.body[1];

    const update = await database.update_new_customer_data(customer_datas, order_datas);

    if (!update) {
      return res.status(400).send('something wrong');
    }

    // SUCCESS — emit the live notification before responding
    emitActivity(
      'customer',
      `New customer registered: ${customer_datas?.name || 'Unknown'}`,
      {
        customer_id: update?.customer_id || update?.customer?.customer_id,
        order_id:    update?.order_id    || update?.order?.order_id
      }
    );

    // (optional) still broadcast any existing events your UI listens for
    io.emit('order-status-updated');

    return res.status(200).send(update);
  } catch (err) {
    console.error('new-entry error', err);
    return res.status(500).send('server error');
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

  // Lightweight activity (generic route – we may not have order_id here)
  if (status) {
    const s = String(status).toLowerCase();
    if (s.includes('ready')) {
      emitActivity('ready', `Order(s) for customer ${customer_id} marked ready for pickup`, { customer_id });
    } else if (s.includes('picked')) {
      emitActivity('pickup', `Order(s) for customer ${customer_id} picked up`, { customer_id });
    } else if (s.includes('process')) {
      emitActivity('processing', `Order status updated for customer ${customer_id}: ${status}`, { customer_id });
    }
  }

  res.status(200).send('Updated orders data successfully');
});

app.put('/crates', async (req, res) => {
  const { crate_id, status } = req.body;
  const result = await database.update_crates_status(crate_id, status);

  if (!result) {
    return res.status(400).send("cannot update crate status");
  }

  emitActivity('processing', `Crate ${crate_id} status → ${status}`, { crate_id, status });
  res.status(200).send('Updated crate status successfully');
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

const markDoneHandler = async (req, res) => {
  const { order_id } = req.params;
  const { comment = "" } = req.body || {};

  try {
    // Update order status + create BOX_* entries
    const result = await database.markOrderAsDone(order_id, comment);

    // Broadcast
    io.emit("order-status-updated", { order_id, status: "processing complete" });
    emitActivity('processing', `Order ${order_id} processing completed`, { order_id });

    res.status(200).json({
      message: "Order marked as done",
      ...(result || {})
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
app.post('/orders/:order_id/mark-done', markDoneHandler); 

  app.put('/orders/:order_id', async (req, res) => {
    const { order_id } = req.params;
    const { weight_kg, estimated_pouches, estimated_boxes } = req.body;
  
    try {
      await database.updateOrderInfo(order_id, {
        weight_kg,
        estimated_pouches,
        estimated_boxes
      });
      // Notify all clients that orders have been updated
      emitActivity('processing', `Order ${order_id} info updated`, { order_id });

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
      emitActivity('warehouse', `Pallet ${pallet_id} created (${location})`, { pallet_id, location });
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
    emitActivity('warehouse', `Pallet ${pallet_id} deleted`, { pallet_id });
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
    const phone = order.phone;

    if (phone) {
      await publishDirectSMS(
        phone,
        `Hi ${order.name}, your juice order is ready for pickup.`
      );
    }

    io.emit("order-status-updated");
    emitActivity('ready', `Order ${order_id} ready for pickup`, { order_id });

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
  
      io.emit("order-status-updated");
      emitActivity('pickup', `Order ${order_id} picked up`, { order_id });
  
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
  
      const io = req.app.get('io');
      if (io) io.emit('pallet-updated', { pallet_id, holding });
  
      emitActivity('warehouse',
        `Loaded ${Array.isArray(assigned) ? assigned.length : (boxes.length || 0)} box(es) onto pallet ${pallet_id}`,
        { pallet_id });
  
      res.json({ message: 'Boxes assigned to pallet', assigned, holding });
    } catch (e) {
      console.error('Error assigning boxes:', e);
      res.status(500).json({ error: 'Failed to assign boxes to pallet' });
    }
  });
  

  // ─── Pallet → Shelf (mark orders ready; optionally SMS) ─────────────
  app.post('/pallets/assign-shelf', async (req, res) => {
    const { palletId, shelfId } = req.body || {};
    if (!palletId || !shelfId) {
      return res.status(400).json({ ok: false, error: 'palletId and shelfId are required' });
    }
  
    try {
      // 1) Link pallet to shelf
      const assignResult = await database.assignPalletToShelf(palletId, shelfId);
  
      // 2) Mark orders ready
      let ready = { updated: 0, orderIds: [] };
      if (typeof database.markOrdersOnPalletReady === 'function') {
        ready = await database.markOrdersOnPalletReady(palletId);
      }
  
      // 3) SMS notify customers (location-specific)
      let customers = [];
      if (typeof database.getCustomersByPalletId === 'function') {
        customers = await database.getCustomersByPalletId(palletId);
      }
  
      // Get shelf to infer location text
      let shelf = null;
      if (typeof database.getShelfById === 'function') {
        try { shelf = await database.getShelfById(shelfId); } catch (_) {}
      }
  
      const locationForSMS = resolveLocationForSMS({ shelf, customers, fallback: '' });
      const smsText = buildPickupSMSText(locationForSMS);
  
      // Deduplicate phones
      const uniquePhones = Array.from(
        new Set(customers.map(c => (c && c.phone ? String(c.phone).trim() : '')).filter(Boolean))
      );
  
      const results = [];
      for (const phone of uniquePhones) {
        try {
          const messageId = await publishDirectSMS(phone, smsText);
          results.push({ ok: true, phone, messageId });
        } catch (e) {
          results.push({ ok: false, phone, error: e.message });
        }
      }
  
      // 4) Broadcast + activity
      io.emit("order-status-updated");
      io.emit("pallet-updated", { pallet_id: palletId, shelfId });
  
      emitActivity('warehouse', `Pallet ${palletId} assigned to shelf ${shelfId}`, { pallet_id: palletId, shelf_id: shelfId });
      if (ready.updated > 0) {
        emitActivity('ready', `${ready.updated} order(s) ready for pickup (pallet ${palletId})`, { pallet_id: palletId });
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
  

  
// ─── Boxes → Shelf (Kuopio direct) (mark ready; optionally SMS) ─────
app.post('/shelves/load-boxes', async (req, res) => {
  const { shelfId, boxes } = req.body || {};
  if (!shelfId || !Array.isArray(boxes) || boxes.length === 0) {
    return res.status(400).json({ ok: false, error: 'shelfId and non-empty boxes[] are required' });
  }

  try {
    // 1) Place boxes on shelf directly
    const placed = await database.assignBoxesToShelf(shelfId, boxes);

    // 2) Mark orders ready (based on those boxes)
    const ready = await database.markOrdersFromBoxesReady(boxes);

    // 3) SMS notify customers
    const customers = await database.getCustomersByBoxIds(boxes);

    // Resolve shelf and location
    let shelf = null;
    if (typeof database.getShelfById === 'function') {
      try { shelf = await database.getShelfById(shelfId); } catch (_) {}
    }
    const locationForSMS = resolveLocationForSMS({ shelf, customers, fallback: '' });
    const smsText = buildPickupSMSText(locationForSMS);

    // De-dup & send
    const smsResults = [];
    const uniquePhones = Array.from(
      new Set(customers.map(c => (c && c.phone ? String(c.phone).trim() : "")).filter(Boolean))
    );

    for (const phone of uniquePhones) {
      try {
        const messageId = await publishDirectSMS(phone, smsText);
        smsResults.push({ ok: true, phone, messageId });
      } catch (e) {
        smsResults.push({ ok: false, phone, error: e.message });
      }
    }

    // 4) Broadcast + activity
    io.emit("order-status-updated");
    io.emit("shelf-updated", { shelf_id: shelfId });

    emitActivity('warehouse', `Loaded ${boxes.length} box(es) onto shelf ${shelfId}`, { shelf_id: shelfId });
    if (ready.updated > 0) {
      emitActivity('ready', `${ready.updated} order(s) ready for pickup`, { shelf_id: shelfId });
    }

    return res.json({
      ok: true,
      placed,
      ready,
      notified: smsResults.filter(r => r.ok).length,
      sms: smsResults,
    });
  } catch (e) {
    console.error('shelves/load-boxes failed:', e);
    return res.status(500).json({ ok: false, error: 'shelves/load-boxes failed', details: e.message });
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
    emitActivity('warehouse', `Shelf created: ${shelf_name || shelf?.shelf_id} @ ${location}`, {
      shelf_id: shelf?.shelf_id, location
    });
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
    emitActivity('warehouse', `Shelf ${shelf_id} deleted`, { shelf_id });
    res.status(200).json({ message: 'Shelf deleted successfully' });
  } catch (err) {
    console.error('Error deleting shelf:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/cities', async (req, res) => {
    try {
        const cities = await database.getAllCities(); 
        const cityNames = cities.map(city => city.name); 
        res.json(cityNames);
    } catch (err) {
        console.error('Error fetching cities:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/shelves/:shelf_id/contents', async (req, res) => {
    const { shelf_id } = req.params;
    try {
      const [pallet] = await database.pool.query(
        'SELECT * FROM Pallets WHERE shelf_id = ? LIMIT 1',
        [shelf_id]
      );
  
      if (!pallet.length) return res.status(404).json({ error: "No pallet on this shelf" });
  
      const [boxes] = await database.pool.query(
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


// --- Printer: Built-in test print with timeout fallback ---
app.post("/printer/test-print", async (req, res) => {
  const s = new net.Socket();
  let replied = false;

  const cleanup = () => {
    try { s.end(); } catch {}
    try { s.destroy(); } catch {}
  };

  // 3s fallback if printer returns no data
  const timer = setTimeout(() => {
    if (replied) return;
    replied = true;
    cleanup();
    return res.json({
      status: "sent",
      note: "No data received from printer after TPR (likely normal). Command sent."
    });
  }, 3000);

  s.once("error", (err) => {
    if (replied) return;
    replied = true;
    clearTimeout(timer);
    cleanup();
    return res.status(500).json({ status: "error", message: err.message });
  });

  s.connect(3001, "192.168.1.149", () => {
    // Send CR + TPR
    s.write("\rTPR\r");

    // If printer does send data, reply immediately
    s.once("data", (buf) => {
      if (replied) return;
      replied = true;
      clearTimeout(timer);
      cleanup();
      return res.json({ status: "ok", response: buf.toString("utf8").trim() });
    });
  });
});


app.post("/printer/print-pouch", async (req, res) => {
  try {
    const { customer, productionDate } = req.body;
    const result = await printPouch({
      host: "192.168.1.139",
      port: 3003,
      job: "Mehustaja",
      customer,
      productionDate,
    });
    console.log("Sent to printer:", result);
    res.json({ status: "ok", ...result });
  } catch (err) {
    console.error("print-pouch failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});


app.get('/dashboard/summary', async (req, res) => {
  try {
    const data = await database.getDashboardSummary();
    res.json(data);
  } catch (err) {
    console.error('summary error:', err);
    res.status(500).json({ error: 'Failed to compute summary' });
  }
});

app.get('/dashboard/activity', async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await database.getRecentActivity(limit);
    res.json(data);
  } catch (err) {
    console.error('activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Manual SMS from Customer Management
app.post('/customers/:customerId/notify', async (req, res) => {
  const { customerId } = req.params;
  const { phone, message, location } = req.body || {};

  try {
    let targetPhone = phone;
    if (!targetPhone) {
      // If not provided, try to fetch from DB
      if (typeof database.getCustomerById === 'function') {
        const c = await database.getCustomerById(customerId);
        targetPhone = c?.phone || '';
      }
    }
    if (!targetPhone) {
      return res.status(400).json({ ok: false, error: 'No phone number found' });
    }

    // If caller didn’t send a message, build from location (or generic)
    const smsText = message && String(message).trim().length
      ? message
      : buildPickupSMSText(location || '');

    const messageId = await publishDirectSMS(targetPhone, smsText);
    emitActivity('notify', `Manual SMS sent to ${customerId}`, { customer_id: customerId });

    return res.json({ ok: true, messageId });
  } catch (e) {
    console.error('manual notify failed:', e);
    return res.status(500).json({ ok: false, error: e.code || 'notify_failed', details: e.message });
  }
});

// Helper: Parse file content into object
function parseSettingsFile(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((acc, line) => {
      const [key, value] = line.split(":");
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {});
}


// Helper: Convert object back to file format
// Convert object to file format with each setting on a new line
function stringifySettings(obj) {
  return Object.entries(obj)
    .map(([key, value]) => `${key}:${value}`)
    .join("\n"); // use newline instead of comma
}


app.get("/default-setting", async (req, res) => {
  try {
    const content = await fs.readFile(settingsFilePath, "utf8");
    const settings = parseSettingsFile(content);
    res.json(settings);
  } catch (e) {
    console.error("Failed to read default-setting.txt:", e);
    res.status(500).json({ error: "read_failed", details: e.message });
  }
});


app.post("/default-setting", async (req, res) => {
  const { juice_quantity, no_pouches, price, shipping_fee, id, password, newCities, newAdminPassword, printer_ip  } = req.body || {};

  try {
    // Check credentials in MySQL Account table
    const isValid = await database.checkPassword(id, password);
    if (!isValid) {
      return res.status(401).json({ error: "Incorrect username or password" });
    }

    // Credentials are correct, proceed to update settings
    let currentContent = "";
    try {
      currentContent = await fs.readFile(settingsFilePath, "utf8");
    } catch {
      currentContent = "";
    }

    const settings = parseSettingsFile(currentContent);

    if (juice_quantity !== undefined) settings.juice_quantity = juice_quantity;
    if (no_pouches !== undefined) settings.no_pouches = no_pouches;
    if (price !== undefined) settings.price = price;
    if (shipping_fee !== undefined) settings.shipping_fee = shipping_fee;
    if (printer_ip !== undefined) settings.printer_ip = printer_ip;


    await fs.writeFile(settingsFilePath, stringifySettings(settings), "utf8");

    if (newAdminPassword?.trim()) {
    await database.updateAdminPassword(id, newAdminPassword.trim());
    }

    if (newCities?.trim()) {
      const cityArray = newCities.split(",").map(c => c.trim()).filter(Boolean);
      await database.addCities(cityArray);
    }



    res.json(settings);
  } catch (e) {
    console.error("Failed to update default-setting.txt:", e);
    res.status(500).json({ error: "write_failed", details: e.message });
  }
});



// Health check
// server.js
app.get('/health', async (req, res) => {
  try {
    // Try the most common shapes first
    if (typeof database.query === 'function') {
      await database.query('SELECT 1 AS ok');
    } else if (typeof database.execute === 'function') {
      await database.execute('SELECT 1 AS ok');
    } else if (typeof database.ping === 'function') {
      await database.ping();                // if you add the helper below
    } else if (database.pool?.query) {
      await database.pool.query('SELECT 1 AS ok'); // some wrappers expose pool
    } else {
      throw new Error('No query/execute/ping method found on database wrapper');
    }

    res.json({ ok: true, db: 'up' });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ ok: false, db: 'down', error: err.message });
  }
});

// NEW
app.get('/shelves/:shelfId/contents', async (req, res) => {
  try {
    const { shelfId } = req.params;
    if (!shelfId) return res.status(400).json({ ok: false, error: 'Missing shelfId' });

    const [shelf, boxes] = await Promise.all([
      database.getShelfDetails(shelfId),
      database.getShelfContents(shelfId),
    ]);

    if (!shelf) return res.status(404).json({ ok: false, error: 'Shelf not found' });

    return res.json({ ok: true, shelf, boxes });
  } catch (err) {
    console.error('GET /shelves/:shelfId/contents failed:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
});



// Start the HTTP server (not just Express)
server.listen(5001, () => {
  console.log("server is listening at port 5001!!");
});
