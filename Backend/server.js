const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
const database = require('./source/database_fns');
const { router: authRouter } = require("./auth");
const uuid = require('./source/uuid');
const { publishDirectSMS } = require('./utils/aws_sns');
const { printPouch } = require("./source/printers/videojet6330");
const net = require("net");

const app = express();
const server = http.createServer(app);
const pool = database.pool;

const settingsFilePath = path.join(__dirname, "default-setting.txt");

const io = new Server(server, {
  cors: {
    origin: ['https://system.mehustaja.fi', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach io to app so routes can access it
app.set('io', io);

// REST API CORS
app.use(cors({
  origin: ['https://system.mehustaja.fi', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// ---------- SMS templates ----------
const smsTemplatesFilePath = path.join(__dirname, "data", "sms-templates.json");

const IDEMPOTENCY_TTL_MS = 10_000; // 10s window to dedupe accidental repeats
const recentRequests = new Map();


function makeIdempotencyKey({ shelfId, boxes, customers }) {
  const sortedBoxes = Array.isArray(boxes)
    ? [...boxes].map(String).sort()
    : [];

  const customerKeys = Array.isArray(customers)
    ? customers
        .map(c => c?.customer_id || c?.id || "")
        .filter(Boolean)
        .map(String)
        .sort()
    : [];

  return `shelf:${String(shelfId || "")}|boxes:${sortedBoxes.join(",")}|cust:${customerKeys.join(",")}`;
}

// --- Phone normalizer (minimal, non-invasive) ---
function normalizePhone(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // keep leading "+" if present; remove all other non-digits
  const cleaned = s.startsWith("+")
    ? "+" + s.slice(1).replace(/[^\d]/g, "")
    : s.replace(/[^\d]/g, "");

  if (!cleaned) return null;

  // Already E.164-ish
  if (cleaned.startsWith("+")) return cleaned;

  // If you want stricter rules, plug them here. For now, assume local numbers
  // are sent as digits and we just prefix "+" (server-side SNS will validate).
  return "+358" + cleaned;
}

const DEFAULT_SMS_TEMPLATES = {
  lapinlahti: [
    "Hei, Mehunne ovat valmiina ja odottavat noutoanne, Anjan Pihaputiikki, Lapinlahti",
    "puh. 044 073 3447",
    "Avoinna. Maanantai-Perjantai 09-17, Lauantai 09-13"
  ].join("\n"),
  kuopio: [
    "Hei, Mehunne ovat valmiina ja odottavat noutoanne Mehustajalla.",
    "Olemme avoinna Ma klo 8-17 ja Ti - Pe klo 9-17",
    "Ystävällisin terveisin, Mehustajat"
  ].join("\n"),
  lahti: [
    "Hei, mehunne ovat valmiina noudettavaksi Vihertalo Varpulasta",
    "Rajakatu 2, Lahti",
    "Olemme avoinna Ma-Pe klo 10-18  ja La 9-15",
    "Terveisin Mehustaja"
  ].join("\n"),
  joensuu: [
    "Hei, Mehunne ovat valmiina osoitteessa",
    "Joensuu Nuorisoverstas",
    "Tulliportinkatu 54",
    "Mehut voi noutaa Ti ja To 9-14",
    "puh: 050 4395406 Terveisin Mehustaja"
  ].join("\n"),
  mikkeli: [
    "Hei, Mehunne ovat valmiina ja odottavat noutoanne osoitteessa Nuorten Työpajat Mikkeli.",
    "Noutopiste on avoinna Ma 09.30-14.00, Ti 8-16, Ke 8-16, To 09.30-14.00",
    "Ystävällisin terveisin Mehustaja."
  ].join("\n"),
  varkaus: [
    "Hei, Mehunne ovat valmiina ja odottavat noutoanne osoitteessa XXX Varkaus, paikka on sama jonne omenat on jätetty.",
    "HUOM! Noutopiste on avoinna XXXXXX",
    "Ystävällisin terveisin, Mehustaja"
  ].join("\n"),
  default: "Hei! Mehunne ovat valmiina noudettavaksi. Ystävällisin terveisin, Mehustaja"
};

let SMS_TEMPLATES_CACHE = null;

async function ensureSmsTemplatesFile() {
  try {
    await fs.access(smsTemplatesFilePath);
  } catch {
    await fs.mkdir(path.dirname(smsTemplatesFilePath), { recursive: true });
    await fs.writeFile(
      smsTemplatesFilePath,
      JSON.stringify(DEFAULT_SMS_TEMPLATES, null, 2),
      "utf8"
    );
  }
}

async function loadSmsTemplates() {
  try {
    await ensureSmsTemplatesFile();
    const txt = await fs.readFile(smsTemplatesFilePath, "utf8");
    const obj = JSON.parse(txt || "{}");
    const normalized = Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [String(k).toLowerCase(), String(v)])
    );
    if (!normalized.default) normalized.default = DEFAULT_SMS_TEMPLATES.default;
    SMS_TEMPLATES_CACHE = { ...DEFAULT_SMS_TEMPLATES, ...normalized };
    return SMS_TEMPLATES_CACHE;
  } catch (e) {
    console.error("Failed to load sms-templates.json, using defaults:", e.message);
    SMS_TEMPLATES_CACHE = { ...DEFAULT_SMS_TEMPLATES };
    return SMS_TEMPLATES_CACHE;
  }
}

async function saveSmsTemplates(newTemplates = {}) {
  const normalized = Object.fromEntries(
    Object.entries(newTemplates).map(([k, v]) => [String(k).toLowerCase(), String(v ?? "")])
  );
  const merged = { ...DEFAULT_SMS_TEMPLATES, ...normalized };
  await fs.mkdir(path.dirname(smsTemplatesFilePath), { recursive: true });
  await fs.writeFile(smsTemplatesFilePath, JSON.stringify(merged, null, 2), "utf8");
  SMS_TEMPLATES_CACHE = merged;
  return merged;
}

// Load templates at startup
loadSmsTemplates().catch(() => {});

// ---------- Socket.IO ----------
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Example emitActivity
function emitActivity(type, message, extra = {}) {
  io.emit("activity", {
    type,
    message,
    ts: new Date().toISOString(),
    ...extra,
  });
}

// ---------- Routes ----------
app.use("/auth", authRouter);

app.get('/ping', (req, res) => {
  res.json({ msg: 'pong' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Location-specific pickup SMS templates
// Usage: const smsText = buildPickupSMSText(locationString);
// If location is unknown, returns a sensible default.
// ─────────────────────────────────────────────────────────────────────────────
// Location-based pickup SMS templates (Finnish)
function buildPickupSMSText(locationRaw) {
  const l = String(locationRaw || "").trim().toLowerCase();
  const source = SMS_TEMPLATES_CACHE || DEFAULT_SMS_TEMPLATES;
  return source[l] || source.default;
}

// --- Force account-level SMS defaults (no change to aws_sns.js needed) ---
const AWS = require("aws-sdk");

(async () => {
  try {
    const sns = new AWS.SNS({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    // 1–11 chars, letters/digits only, must start with a letter
    const SENDER_ID = (process.env.SNS_SENDER_ID || "Mehustaja")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 11);

    await sns.setSMSAttributes({
      attributes: {
        DefaultSenderID: SENDER_ID,
        DefaultSMSType: "Transactional",
      },
    }).promise();

    console.log(`[SNS] Default SenderID set to "${SENDER_ID}" (Transactional)`);
  } catch (e) {
    console.warn("[SNS] Could not set account SMS attributes:", e.message);
  }
})();

// Small helper: try to pick a location string from known objects
function resolveLocationForSMS({ shelf, customers, fallback }) {
  // Priority: shelf.location → shelf.shelf_name → customer.city → fallback
  if (shelf && shelf.location) return shelf.location;
  if (shelf && shelf.shelf_name) return shelf.shelf_name;
  const c = Array.isArray(customers) ? customers.find(x => x && x.city) : null;
  if (c && c.city) return c.city;
  return fallback || "";
}

// Add near your other helpers in server.js
async function getCurrentSettings() {
  try {
    const content = await fs.readFile(settingsFilePath, "utf8");
    return parseSettingsFile(content);
  } catch {
    return {};
  }
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
  

  app.post('/pallets/assign-shelf', async (req, res) => {
    const { palletId, shelfId, sendSms } = req.body || {};
    if (!palletId || !shelfId) {
      return res.status(400).json({ ok: false, error: 'palletId and shelfId are required' });
    }
  
    try {
      // 1) Link pallet to shelf
      const assignResult = await database.assignPalletToShelf(palletId, shelfId);
  
      // 2) Mark orders ready (if supported)
      let ready = { updated: 0, orderIds: [] };
      if (typeof database.markOrdersOnPalletReady === 'function') {
        ready = await database.markOrdersOnPalletReady(palletId);
      }
  
      // 3) Collect customers (id, name, phone, city)
      const customers = (typeof database.getCustomersByPalletId === 'function')
        ? (await database.getCustomersByPalletId(palletId)) || []
        : [];
  
      // Optional: shelf label (kept even if not used in SMS content)
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
  
      // 4) Optional SMS
      const sms = [];
      if (sendSms === true) {
        const seen = new Set();
        for (const c of customers) {
          if (!c?.customer_id || seen.has(c.customer_id)) continue;
          seen.add(c.customer_id);
  
          const phone = c?.phone ? String(c.phone).trim() : '';
          if (!phone) continue;
  
          const msg = buildPickupSMSText(c?.city || '');
          try {
            const messageId = await publishDirectSMS(phone, msg);
            sms.push({ ok: true, customer_id: c.customer_id, phone, messageId });
  
            if (typeof database.incrementSmsSent === 'function') {
              await database.incrementSmsSent(c.customer_id);
            }
          } catch (e) {
            sms.push({ ok: false, customer_id: c.customer_id, phone, error: e.message });
          }
        }
      } else if (sendSms === false) {
        const seen = new Set();
        for (const c of customers) {
          if (!c?.customer_id || seen.has(c.customer_id)) continue;
          seen.add(c.customer_id);
          if (typeof database.markSmsSkipped === 'function') {
            await database.markSmsSkipped(c.customer_id);
          }
        }
      }
  
      // 5) Broadcast + activity
      io.emit('order-status-updated');
      io.emit('pallet-updated', { pallet_id: palletId, shelfId });
  
      emitActivity('warehouse', `Pallet ${palletId} assigned to shelf ${shelfId}`, { pallet_id: palletId, shelf_id: shelfId });
      if (ready.updated > 0) {
        emitActivity('ready', `${ready.updated} order(s) ready for pickup (pallet ${palletId})`, { pallet_id: palletId });
      }
  
      return res.json({
        ok: true,
        message: 'Pallet assigned; orders ready; SMS processed',
        assignResult,
        ready,
        notified: sms.filter(r => r.ok).length,
        sms,
      });
    } catch (err) {
      console.error('assign-shelf failed:', err);
      return res.status(500).json({ ok: false, error: 'assign-shelf failed', details: err.message });
    }
  });  
  
// ─── Boxes → Shelf (Kuopio direct) (mark ready; optionally SMS) ─────
app.post('/shelves/load-boxes', async (req, res) => {
  const { shelfId, boxes, sendSms } = req.body || {};


  const q = (req.query && (req.query.notifyNow ?? req.query.notify))
  ? String(req.query.notifyNow ?? req.query.notify).toLowerCase()
  : undefined;
  const smsDecision = (typeof sendSms === 'boolean')
  ? sendSms
  : (typeof q !== 'undefined'
      ? (q === '1' || q === 'true' || q === 'yes' || q === 'y')
      : undefined);
  if (!shelfId || !Array.isArray(boxes) || boxes.length === 0) {
    return res.status(400).json({ ok: false, error: 'shelfId and non-empty boxes[] are required' });
  }

  try {
    // 1) Place boxes
    const placed = await database.assignBoxesToShelf(shelfId, boxes);

    // 2) Mark orders ready
    const ready = await database.markOrdersFromBoxesReady(boxes);

    // 3) Get customers for those boxes (id, name, phone, city)
    const customers = (await database.getCustomersByBoxIds(boxes)) || [];

    // ----- NEW: idempotency (in-memory) -----
    const clientKey = req.get('Idempotency-Key'); // allow client-provided key
    const autoKey = makeIdempotencyKey({ shelfId, boxes, customers });
    const key = clientKey || autoKey;
    const now = Date.now();
    const last = recentRequests.get(key);
    if (last && now - last < IDEMPOTENCY_TTL_MS) {
      return res.json({
        ok: true,
        placed,
        ready,
        notified: 0,
        sms: [],
        deduped: true
      });
    }
    recentRequests.set(key, now);
    // ----------------------------------------

    // 3b) (Optional) shelf display
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

    const sms = [];
    if (smsDecision === true) {
      const seenCustomers = new Set();
      const seenPhones = new Set(); // ----- NEW: phone-level dedupe -----

      for (const c of customers) {
        const cid = c?.customer_id;
        if (!cid || seenCustomers.has(cid)) continue;
        seenCustomers.add(cid);

        const phoneRaw = c?.phone ? String(c.phone).trim() : '';
        const phone = normalizePhone(phoneRaw);
        if (!phone) continue;

        // skip if we've already messaged this phone in this request
        if (seenPhones.has(phone)) {
          sms.push({ ok: false, customer_id: cid, phone, skipped: 'duplicate_phone_in_batch' });
          continue;
        }
        seenPhones.add(phone);

        const msg = buildPickupSMSText(c?.city || '');
        try {
          const messageId = await publishDirectSMS(phone, msg);
          sms.push({ ok: true, customer_id: cid, phone, messageId });

          if (typeof database.incrementSmsSent === 'function') {
            await database.incrementSmsSent(cid);
          }
        } catch (e) {
          sms.push({ ok: false, customer_id: cid, phone, error: e.message });
        }
      }
    } else if (smsDecision === false) {
      const seen = new Set();
      for (const c of customers) {
        if (!c?.customer_id || seen.has(c.customer_id)) continue;
        seen.add(c.customer_id);
        if (typeof database.markSmsSkipped === 'function') {
          await database.markSmsSkipped(c.customer_id);
        }
      }
    }

    // 5) Broadcast + activity
    io.emit('order-status-updated');
    io.emit('shelf-updated', { shelf_id: shelfId });

    emitActivity('warehouse', `Loaded ${boxes.length} box(es) onto shelf ${shelfId}`, { shelf_id: shelfId });
    if (ready.updated > 0) {
      emitActivity('ready', `${ready.updated} order(s) ready for pickup`, { shelf_id: shelfId });
    }

    return res.json({
      ok: true,
      placed,
      ready,
      notified: sms.filter(r => r.ok).length,
      sms,
    });
  } catch (err) {
    console.error('shelves/load-boxes failed:', err);
    return res.status(500).json({ ok: false, error: 'shelves/load-boxes failed', details: err.message });
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

  try {
    const { printer_ip = "192.168.1.149" } = await getCurrentSettings(); // <-- dynamic IP
    s.connect(3001, printer_ip, () => {
      s.write("\rTPR\r");
      s.once("data", (buf) => {
        if (replied) return;
        replied = true;
        clearTimeout(timer);
        cleanup();
        return res.json({ status: "ok", response: buf.toString("utf8").trim() });
      });
    });
  } catch (e) {
    if (!replied) {
      replied = true;
      clearTimeout(timer);
      cleanup();
      return res.status(500).json({ status: "error", message: e.message });
    }
  }
});

//Pouch printing route
app.post("/printer/print-pouch", async (req, res) => {
  try {
    const { customer, firstName, lastName, productionDate, expiryDate } = req.body || {};

    // dynamic IP from settings file
    const { printer_ip = "192.168.1.139" } = await getCurrentSettings();

    const result = await printPouch({
      host: printer_ip,
      port: 3003,
      job: "Mehustaja",          // default job name
      customer,                 
      firstName,
      lastName,
      productionDate,        
      expiryDate,          
    });

    console.log("Videojet sent:", result);
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

app.get('/dashboard/daily-totals', async (req, res) => {
  try {
    const { days } = req.query; // optional, defaults to 30
    const data = await database.getDailyTotals(days);
    res.json(data);
  } catch (err) {
    console.error('daily-totals error:', err);
    res.status(500).json({ error: 'Failed to fetch daily totals' });
  }
});

// Manual SMS from Customer Management (uses location-specific templates by default)
app.post('/customers/:customerId/notify', async (req, res) => {
  const { customerId } = req.params;
  const { phone: bodyPhone, message, location: bodyLocation } = req.body || {};

  try {
    // Fetch once if needed
    const customer = (typeof database.getCustomerById === 'function')
      ? await database.getCustomerById(customerId)
      : null;

    const targetPhone = String(bodyPhone || customer?.phone || '').trim();
    if (!targetPhone) {
      return res.status(400).json({ ok: false, error: 'No phone number found' });
    }

    const locationForTemplate = (bodyLocation || customer?.city || '').trim();
    const smsText =
      message && String(message).trim().length
        ? String(message)
        : buildPickupSMSText(locationForTemplate);

    const messageId = await publishDirectSMS(targetPhone, smsText);

    // Log + increment status
    if (typeof emitActivity === 'function') {
      emitActivity('notify', `Manual SMS sent to ${customer?.name || 'customer'}`, {
        customer_id: customerId,
        city: locationForTemplate || null,
      });
    }
    // mark "sent"
    await database.incrementSmsSent(customerId);

    return res.json({ ok: true, message: 'SMS attempted', messageId });
  } catch (e) {
    console.error('manual notify failed:', e);
    return res.status(500).json({
      ok: false,
      error: e.code || 'notify_failed',
      details: e.message,
    });
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
  
  const { juice_quantity, no_pouches, price, shipping_fee, id, password, newCities, newAdminPassword, printer_ip, newEmployeePassword} = req.body;
  console.log(req.body);

  console.log("Received body:", req.body);
  console.log("Keys:", Object.keys(req.body));

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
    if (newEmployeePassword?.trim()) {
      console.log("Updating employee password to:", newEmployeePassword);
      await database.updateEmployeePassword(newEmployeePassword.trim());
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

app.put('/orders/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const result = await database.updateOrderInfo(orderId, req.body);
    return res.json({ ok: true, affected: result.affectedRows || 0 });
  } catch (e) {
    console.error('Failed to update order:', e);
    return res.status(500).json({ ok: false, error: 'update-failed' });
  }
});
// --- GET current order status / "is done" check ---
app.get('/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  try {
    if (typeof database.getOrderStatus !== 'function') {
      return res.status(500).json({ ok: false, error: 'getOrderStatus not available' });
    }

    const row = await database.getOrderStatus(orderId); // { status, is_done? }
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    const raw = String(row.status || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const done =
      raw === 'processing complete' ||
      raw === 'processed' ||
      raw === 'complete' ||
      raw === 'completed' ||
      raw === 'ready for pallet' ||
      raw === 'ready for pickup' ||
      raw === 'ready' ||
      raw === 'done' ||
      row.is_done === 1 || row.is_done === true;

    res.json({ ok: true, status: row.status || '', done });
  } catch (e) {
    console.error('get /orders/:orderId/status failed:', e);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// GET /pallets/:palletId/context
app.get('/pallets/:palletId/order-context', async (req, res) => {
  const { palletId } = req.params;
  try {
    const boxes = await database.getPalletBoxes(palletId);
    const orderIds = Array.from(
      new Set(boxes.map(b => b.order_id).filter(Boolean))
    );
    return res.json({ boxes, orderIds });
  } catch (err) {
    console.error('pallet context failed:', err);
    return res.status(500).json({ error: 'pallet_context_failed' });
  }
});

app.get('/pallets/:palletId/orders', async (req, res) => {
  const { palletId } = req.params;
  try {
    const rows = await database.getOrdersOnPallet(palletId);
    return res.json(rows);
  } catch (err) {
    console.error('orders-on-pallet failed:', err);
    return res.status(500).json({ error: 'orders_on_pallet_failed' });
  }
});

// Get current SMS status for a customer
app.get('/customers/:customerId/sms-status', async (req, res) => {
  try {
    const status = await database.getSmsStatusForCustomer(req.params.customerId);
    return res.json(status);
  } catch (err) {
    console.error('sms-status failed:', err);
    return res.status(500).json({ error: 'sms_status_failed' });
  }
});

// Set/record a customer's latest SMS decision.
// Body: { sent: true | false }
app.post('/customers/:customerId/sms-status', async (req, res) => {
  const { customerId } = req.params;
  const { sent } = req.body || {};
  try {
    const status = sent
      ? await database.incrementSmsSent(customerId)
      : await database.markSmsSkipped(customerId);
    return res.json({ ok: true, status });
  } catch (err) {
    console.error('sms-status POST failed:', err);
    return res.status(500).json({ ok: false, error: 'sms_status_failed' });
  }
});

app.get("/sms-templates", async (req, res) => {
  try {
    const current = SMS_TEMPLATES_CACHE || await loadSmsTemplates();
    res.json({ templates: current });
  } catch (e) {
    console.error("GET /sms-templates failed:", e);
    res.status(500).json({ error: "sms_templates_read_failed" });
  }
});

app.put("/sms-templates", async (req, res) => {
  try {
    const incoming = (req.body && (req.body.templates || req.body)) || {};
    const merged = await saveSmsTemplates(incoming);
    res.json({ ok: true, templates: merged });
  } catch (e) {
    console.error("PUT /sms-templates failed:", e);
    res.status(500).json({ ok: false, error: "sms_templates_write_failed" });
  }
});

// Start the HTTP server (not just Express)
server.listen(5001, () => {
  console.log("server is listening at port 5001!!");
});
