import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";

const customers = [
  {
    name: "Alice Johnson",
    phone: "0551001001",
    juiceLitres: 12, // 24 pouches = 3 crates
  },
  {
    name: "Michael Doe",
    phone: "0551001002",
    juiceLitres: 16, // 32 pouches = 4 crates
  },
  {
    name: "Sarah Lee",
    phone: "0551001003",
    juiceLitres: 8, // 16 pouches = 2 crates
  }
];

const insertData = async () => {
  const conn = await db.getConnection();
  try {
    for (const customer of customers) {
      const customer_id = uuidv4();
      const order_id = uuidv4();
      const total_pouches = customer.juiceLitres * 2; // 0.5L per pouch
      const created_at = new Date();

      await conn.query(
        `INSERT INTO Customers (customer_id, name, phone_number, created_at) VALUES (?, ?, ?, ?)`,
        [customer_id, customer.name, customer.phone, created_at]
      );

      await conn.query(
        `INSERT INTO Orders (order_id, customer_id, total_pouches, status, created_at) VALUES (?, ?, ?, ?, ?)`,
        [order_id, customer_id, total_pouches, "pending", created_at]
      );

      const pouchPerCrate = 8;
      const crateCount = Math.ceil(total_pouches / pouchPerCrate);

      for (let i = 0; i < crateCount; i++) {
        const crate_id = uuidv4();
        const qr_code = `CRATE_${crate_id}`;
        const pouchesInThisCrate = (i < crateCount - 1)
          ? pouchPerCrate
          : total_pouches - (pouchPerCrate * (crateCount - 1));

        await conn.query(
          `INSERT INTO Crates (crate_id, order_id, pouch_count, qr_code, created_at) VALUES (?, ?, ?, ?, ?)`,
          [crate_id, order_id, pouchesInThisCrate, qr_code, created_at]
        );
      }

      console.log(`✅ Seeded ${customer.name} with ${crateCount} crates`);
    }

    console.log("✅ All seed data inserted.");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    conn.release();
    process.exit(0);
  }
};

insertData();
