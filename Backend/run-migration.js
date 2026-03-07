require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.host,
    port: process.env.port,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
  });

  try {
    await c.query("ALTER TABLE ContainerMovements ADD COLUMN `order_id` VARCHAR(36) DEFAULT NULL");
    console.log('Added order_id');
  } catch (e) {
    console.log('order_id:', e.message);
  }

  try {
    await c.query("ALTER TABLE ContainerMovements ADD COLUMN `movement_type` ENUM('manual','order_arrival','order_return') NOT NULL DEFAULT 'manual'");
    console.log('Added movement_type');
  } catch (e) {
    console.log('movement_type:', e.message);
  }

  try {
    await c.query("ALTER TABLE ContainerMovements ADD COLUMN `container_count_type` ENUM('crates','boxes') NOT NULL DEFAULT 'crates'");
    console.log('Added container_count_type');
  } catch (e) {
    console.log('container_count_type:', e.message);
  }

  try {
    await c.query("CREATE INDEX `idx_cm_order_id` ON ContainerMovements (`order_id`)");
    console.log('Added index on order_id');
  } catch (e) {
    console.log('index:', e.message);
  }

  // Verify
  const [rows] = await c.query('DESCRIBE ContainerMovements');
  console.log('\nFinal columns:');
  rows.forEach(r => console.log(' ', r.Field, r.Type));

  await c.end();
  process.exit(0);
})();
