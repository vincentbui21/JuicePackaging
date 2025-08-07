const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const database = require('./source/database_fns');
const uuid = require('./source/uuid');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app); // wrap express app in HTTP server

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

app.get('/orders', async (req, res) => {
    const { status } = req.query;
    const orders = await database.getOrdersByStatus(status);
    res.status(200).json(orders);
  });
  app.post('/orders/:order_id/done', async (req, res) => {
    const { order_id } = req.params;
    const { comment } = req.body;
  
    try {
      // Update order status to "processing complete"
      await database.markOrderAsDone(order_id, comment);
  
      // Notify frontend via socket
      const io = req.app.get('io');
      io.emit("order-status-updated");
  
      res.status(200).json({ message: "Order marked as done" });
    } catch (error) {
      console.error("Failed to mark order as done:", error);
      res.status(500).json({ error: "Failed to mark order as done" });
    }
  });

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
      await database.deleteOrder(order_id); // Ensure this method exists
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
      await database.deletePallet(pallet_id);
      res.status(200).json({ message: "Pallet deleted" });
    } catch (err) {
      console.error("Failed to delete pallet:", err);
      res.status(500).json({ error: "Failed to delete pallet" });
    }
  });
  
  app.post('/orders/:order_id/ready', async (req, res) => {
    const { order_id } = req.params;
  
    try {
      await database.markOrderAsReady(order_id);
      const io = req.app.get('io');
      io.emit("order-status-updated");
  
      res.status(200).json({ message: "Order marked as ready" });
    } catch (error) {
      console.error("Failed to mark order as ready:", error);
      res.status(500).json({ error: "Failed to mark order as ready" });
    }
  });

  app.get('/default-setting', async (req, res) =>{
    try{
      const filePath = path.join(__dirname, 'default-setting.txt');
      const data = await fs.readFile(filePath, 'utf-8');
      res.send(data);
    }
    catch (err){
      console.log("Error reading file", err);
      res.status(500).send("Error")
    }
  })

  app.post('/default-setting', (req, res) => {
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid or missing settings object in request body' });
    }

    const formatted = Object.entries(settings)
      .map(([key, value]) => `${key}:${value}`)
      .join(',\n');

    const filePath = path.join(__dirname, 'default-setting.txt');

    fs.writeFile(filePath, formatted, 'utf8')
      .then(() => {
        res.json({ message: 'Settings saved successfully' });
      })
      .catch((err) => {
        console.error('Failed to write settings:', err);
        res.status(500).json({ error: 'Failed to save settings' });
      });
  });

// Start the HTTP server (not just Express)
server.listen(5001, () => {
  console.log("server is listening at port 5001!!");
});
