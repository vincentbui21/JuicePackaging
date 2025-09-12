// auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const database = require("./source/database_fns"); // adjust path if needed
require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Login route for employee
router.post("/login", async (req, res) => {
  const {id, password } = req.body; // only password is sent from frontend

    if (!password) {
        return res.status(400).json({ error: "Password is required" });
    }

    try {
        const pool = database.pool;

        // Check if password matches for employee
        const [rows] = await pool.query(
        "SELECT id FROM Accounts WHERE id = ? AND password = ? LIMIT 1",
        [id, password]
        );

        if (!rows.length) {
        return res.status(401).json({ error: "Invalid password" });
        }

        const user = rows[0];

        // Generate JWT
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });

        res.json({ token });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
    });

    // Middleware to protect routes
    function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

module.exports = { router, authenticateToken };
