import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

app.use(cors());
app.use(express.json());

// ✅ Get orders by status + customer name
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
    console.error("Fetch orders error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Mark order as processing if crate sum matches pouch total
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
      await conn.query(`UPDATE Orders SET status = 'processing' WHERE order_id = ?`, [orderId]);
      io.emit("orderProcessing", { order_id: orderId });
      res.json({ message: "Order marked as processing." });
    } else {
      res.status(400).json({ message: "Crates not complete." });
    }
  } catch (err) {
    console.error("Processing error:", err);
    res.status(500).json({ error: "Internal error" });
  } finally {
    conn.release();
  }
});

// ✅ Mark order as done + optional comment
app.post("/api/orders/:id/done", async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  try {
    await db.query(
      `UPDATE Orders SET status = 'loading', comment = ? WHERE order_id = ?`,
      [comment || null, id]
    );
    io.emit("order-status-updated");
    res.json({ message: "Order moved to loading" });
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ✅ Assign crates to pallet
app.post("/api/assign-pallet", async (req, res) => {
  const { pallet_id, crate_ids } = req.body;
  if (!pallet_id || !crate_ids?.length) {
    return res.status(400).json({ error: "Missing pallet or crate list" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[palletRow]] = await conn.query(
      `SELECT pallet_id FROM Pallets WHERE qr_code = ?`,
      [pallet_id]
    );
    if (!palletRow) throw new Error("Pallet QR not found");
    const realPalletId = palletRow.pallet_id;

    const [crateRows] = await conn.query(
      `SELECT crate_id, order_id FROM Crates WHERE qr_code IN (?)`,
      [crate_ids]
    );
    const realCrateIds = crateRows.map(c => c.crate_id);
    const orderIds = [...new Set(crateRows.map(c => c.order_id))];

    for (const crate_id of realCrateIds) {
      await conn.query(
        `INSERT INTO PalletCrateMapping (mapping_id, pallet_id, crate_id) VALUES (?, ?, ?)`,
        [uuidv4(), realPalletId, crate_id]
      );
    }

    await conn.query(`UPDATE Pallets SET status = 'full' WHERE pallet_id = ?`, [realPalletId]);

    for (const orderId of orderIds) {
      const [[{ total }]] = await conn.query(
        `SELECT COUNT(*) AS total FROM Crates WHERE order_id = ?`,
        [orderId]
      );
      const [[{ mapped }]] = await conn.query(
        `SELECT COUNT(*) AS mapped FROM Crates c
         JOIN PalletCrateMapping pcm ON c.crate_id = pcm.crate_id
         WHERE c.order_id = ?`,
        [orderId]
      );
      if (total === mapped) {
        await conn.query(`UPDATE Orders SET status = 'ready-for-pickup' WHERE order_id = ?`, [orderId]);
        io.emit("orderReady", { order_id: orderId });
      }
    }

    await conn.commit();
    res.json({ message: "Assignment successful." });
  } catch (err) {
    await conn.rollback();
    console.error("Assign pallet failed:", err);
    res.status(500).json({ error: "Internal failure" });
  } finally {
    conn.release();
  }
});

server.listen(3001, () => console.log("✅ Server running on port 3001"));
