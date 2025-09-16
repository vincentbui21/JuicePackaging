// auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const database = require("./source/database_fns");
require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret"; // fallback if missing

// Login route
router.post("/login", async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.json({ success: false, error: "ID and password are required" });
    }

    const pool = database.pool;

    let rows;
    try {
      [rows] = await pool.query(
        "SELECT id, password FROM Accounts WHERE id = ? LIMIT 1",
        [id]
      );
    } catch (dbErr) {
      console.error("[LOGIN] DB error:", dbErr);
      return res.json({ success: false, error: "Database error", details: dbErr.message });
    }

    if (!rows.length) {
      return res.json({ success: false, error: "Invalid credentials" });
    }

    const user = rows[0];

    // Simple password check (plain-text)
    if (user.password !== password) {
      return res.json({ success: false, error: "Invalid credentials" });
    }

    let token;
    try {
      token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
    } catch (jwtErr) {
      console.error("[LOGIN] JWT error:", jwtErr);
      return res.json({ success: false, error: "JWT generation error", details: jwtErr.message });
    }

    return res.json({ success: true, token });
  } catch (err) {
    console.error("[LOGIN] Unexpected error:", err);
    return res.json({ success: false, error: "Internal server error", details: err.message });
  }
});

// Middleware to protect routes
function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.json({ success: false, error: "Missing token" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.json({ success: false, error: "Invalid token" });
      req.user = user;
      next();
    });
  } catch (err) {
    return res.json({ success: false, error: "Token verification error", details: err.message });
  }
}

module.exports = { router, authenticateToken };
