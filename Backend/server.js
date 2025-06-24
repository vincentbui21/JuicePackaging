
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./db.js";
import { v4 as uuidv4 } from "uuid";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Setup server and socket
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});
app.set("io", io);

// --- ROUTES ---

app.get("/", (req, res) => {
  res.send("Juice Backend Running...");
});

// Mark order as 'processing'
app.post("/api/orders/:orderId/processing", async (req, res) => {
  const { orderId } = req.params;
  const conn = await db.getConnection();
  try {
    const [[{ pouch_total }]] = await conn.query(
      `SELECT total_pouches AS pouch_total FROM Orders WHERE order_id = ?`,
      [orderId]
    );

    const [[{ pouch_sum }]] = await conn.query(
      `SELECT SUM(pouch_count) AS pouch_sum FROM Crates WHERE order_id = ?`,
      [orderId]
    );

    if (pouch_total === pouch_sum) {
      await conn.query(
        `UPDATE Orders SET status = 'processing' WHERE order_id = ?`,
        [orderId]
      );

      // Notify frontend
      const io = req.app.get("io");
      io.emit("orderProcessing", { order_id: orderId });

      res.json({ message: "Order marked as processing." });
    } else {
      res.status(400).json({ message: "Crates not complete yet." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error." });
  } finally {
    conn.release();
  }
});

app.post("/api/orders/:id/done", async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  try {
    await db.query(
      "UPDATE Orders SET status = 'loading', processing_comment = ? WHERE order_id = ?",
      [comment || null, id]
    );
    res.json({ message: "Order updated to loading" });
    io.emit("order-status-updated"); // Notify others
  } catch (err) {
    console.error("Failed to update order", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// Assign crates to pallet
app.post("/api/assign-pallet", async (req, res) => {
  const { pallet_id, crate_ids } = req.body;

  if (!pallet_id || !crate_ids || !Array.isArray(crate_ids)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Resolve pallet_id (UUID) from QR code
    const [[palletRow]] = await conn.query(
      "SELECT pallet_id FROM Pallets WHERE qr_code = ?",
      [pallet_id]
    );
    if (!palletRow) {
      return res.status(404).json({ error: "Pallet QR code not found" });
    }
    const realPalletId = palletRow.pallet_id;

    // 2. Resolve crate_ids (UUIDs) from QR codes
    const [crateRows] = await conn.query(
      `SELECT crate_id, order_id FROM Crates WHERE qr_code IN (?)`,
      [crate_ids]
    );

    const realCrateIds = crateRows.map(row => row.crate_id);
    const orderIds = [...new Set(crateRows.map(row => row.order_id))]; // one or more

    if (realCrateIds.length !== crate_ids.length) {
      return res.status(400).json({ error: "Some crate QR codes were not found" });
    }

    // 3. Insert mappings
    for (const crate_id of realCrateIds) {
      const mapping_id = uuidv4();
      await conn.query(
        "INSERT INTO PalletCrateMapping (mapping_id, pallet_id, crate_id) VALUES (?, ?, ?)",
        [mapping_id, realPalletId, crate_id]
      );
    }

    // 4. Update pallet status to 'full'
    await conn.query("UPDATE Pallets SET status = 'full' WHERE pallet_id = ?", [realPalletId]);

    // 5. Update orders to 'ready-for-pickup' if all crates are assigned
    for (const order_id of orderIds) {
      const [[{ total_crates }]] = await conn.query(
        `SELECT COUNT(*) AS total_crates FROM Crates WHERE order_id = ?`,
        [order_id]
      );

      const [[{ mapped_crates }]] = await conn.query(
        `SELECT COUNT(*) AS mapped_crates
         FROM Crates c
         JOIN PalletCrateMapping pcm ON c.crate_id = pcm.crate_id
         WHERE c.order_id = ?`,
        [order_id]
      );

      if (total_crates === mapped_crates) {
        await conn.query(
          `UPDATE Orders SET status = 'ready-for-pickup' WHERE order_id = ?`,
          [order_id]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Crates successfully assigned to pallet." });
  } catch (err) {
    await conn.rollback();
    console.error("Assignment error:", err);
    res.status(500).json({ error: "Failed to assign pallet" });
  } finally {
    conn.release();
  }
});

// Starting server
server.listen(3001, () => {
  console.log("✅ Backend + Socket.IO running on port 3001");
});

app.post("/api/orders/:orderId/done", async (req, res) => {
  const { orderId } = req.params;
  const conn = await db.getConnection();

  try {
    // Updating order status to 'loading'
    await conn.query(
      `UPDATE Orders SET status = 'loading' WHERE order_id = ?`,
      [orderId]
    );

    // update all crates for this order
    await conn.query(
      `UPDATE Crates SET status = 'done' WHERE order_id = ?`,
      [orderId]
    );

    // Emit update if needed
    const io = req.app.get("io");
    io.emit("orderDone", { order_id: orderId });

    res.json({ message: "Order marked as loading." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating order." });
  } finally {
    conn.release();
  }
});

app.get("/api/orders", async (req, res) => {
  const { status } = req.query;
  try {
    const [orders] = await db.query(
      `SELECT Orders.*, Customers.name 
       FROM Orders 
       JOIN Customers ON Orders.customer_id = Customers.customer_id 
       WHERE Orders.status = ?`,
      [status]
    );
    res.json(orders);
  } catch (err) {
    console.error("Failed to fetch orders", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Assign crates to a pallet and update statuses
app.post("/api/assign-pallet", async (req, res) => {
  const { pallet_id, crate_ids } = req.body;

  if (!pallet_id || !crate_ids || !Array.isArray(crate_ids)) {
    return res.status(400).json({ message: "Invalid data" });
  }

  try {
    const conn = await db.getConnection();

    // Insert crate-pallet mappings
    for (const crate_id of crate_ids) {
      await conn.query(
        "INSERT INTO PalletCrateMapping (mapping_id, pallet_id, crate_id) VALUES (UUID(), ?, ?)",
        [pallet_id, crate_id]
      );
    }

    // Mark the pallet as full
    await conn.query("UPDATE Pallets SET status = 'full' WHERE pallet_id = ?", [pallet_id]);

    // Get all order_ids related to crates
    const [crateRows] = await conn.query(
      `SELECT DISTINCT order_id FROM Crates WHERE crate_id IN (?)`,
      [crate_ids]
    );

    // For each order, check if all crates are mapped to a pallet
    for (const row of crateRows) {
      const orderId = row.order_id;

      const [[{ total }]] = await conn.query(
        "SELECT COUNT(*) as total FROM Crates WHERE order_id = ?",
        [orderId]
      );

      const [[{ mapped }]] = await conn.query(
        `SELECT COUNT(*) as mapped FROM Crates c
         JOIN PalletCrateMapping pcm ON c.crate_id = pcm.crate_id
         WHERE c.order_id = ?`,
        [orderId]
      );

      if (mapped === total) {
        // Update order status to ready-for-pickup
        await conn.query(
          "UPDATE Orders SET status = 'ready-for-pickup' WHERE order_id = ?",
          [orderId]
        );

        io.emit("orderReady", { order_id: orderId });
      }
    }

    res.json({ message: "Crates assigned to pallet successfully." });
  } catch (error) {
    console.error("Assign pallet error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/api/assign-pallet", async (req, res) => {
  const { pallet_id, crate_ids } = req.body;

  if (!pallet_id || !crate_ids || !Array.isArray(crate_ids)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert crate-pallet mappings
    for (const crate_id of crate_ids) {
      const mapping_id = uuidv4();
      await conn.query(
        "INSERT INTO PalletCrateMapping (mapping_id, pallet_id, crate_id) VALUES (?, ?, ?)",
        [mapping_id, pallet_id, crate_id]
      );
    }

    // 2. Update pallet to 'full'
    await conn.query("UPDATE Pallets SET status = 'full' WHERE pallet_id = ?", [pallet_id]);

    // 3. Get order IDs from crates
    const [orders] = await conn.query(
      `SELECT DISTINCT order_id FROM Crates WHERE crate_id IN (?)`,
      [crate_ids]
    );

    for (const row of orders) {
      const order_id = row.order_id;

      // Check if all crates for this order are assigned
      const [[{ total_crates }]] = await conn.query(
        `SELECT COUNT(*) as total_crates FROM Crates WHERE order_id = ?`,
        [order_id]
      );

      const [[{ mapped_crates }]] = await conn.query(
        `SELECT COUNT(*) as mapped_crates 
         FROM Crates c
         JOIN PalletCrateMapping pcm ON c.crate_id = pcm.crate_id
         WHERE c.order_id = ?`,
        [order_id]
      );

      if (total_crates === mapped_crates) {
        await conn.query(
          "UPDATE Orders SET status = 'ready-for-pickup' WHERE order_id = ?",
          [order_id]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Pallet assignment successful." });
  } catch (err) {
    await conn.rollback();
    console.error("Assignment error:", err);
    res.status(500).json({ error: "Failed to assign pallet" });
  } finally {
    conn.release();
  }
});
