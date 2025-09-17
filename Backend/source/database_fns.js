require('dotenv').config()
const mysql = require('mysql2');
const { generateUUID } = require('./uuid');
const logic = require("./mehustaja_logic")

const recentRequests = new Map(); // key -> timestamp (in-memory; use Redis for multi-instance)
const IDEMPOTENCY_TTL_MS = 10_000;

// Create connection pool
const pool = mysql.createPool({
    host: process.env.host,
    port: process.env.port,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

async function update_new_customer_data(customer_data, order_data) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const insertCustomerQuery = `
            INSERT INTO Customers (customer_id, name, address, phone, email, city)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const insertOrderQuery = `
            INSERT INTO Orders (order_id, customer_id,status, weight_kg, crate_count, total_cost, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertCrateData = `
            INSERT INTO Crates (crate_id, customer_id, status, created_at, crate_order)
            VALUES (?, ?, ?, ?, ?)
        `

        const customerID = generateUUID()
        const orderID = generateUUID()
        let crateID = []

        await connection.query(insertCustomerQuery, [
            customerID,
            customer_data.full_name,
            customer_data.address,
            customer_data.phone_number,
            customer_data.email,
            customer_data.city
        ]);

        await connection.query(insertOrderQuery, [
            orderID,
            customerID,   
            "Created", // Status
            Number(parseFloat(order_data.total_apple_weight).toFixed(2)), //total_apple_weight
            parseInt(order_data.No_of_Crates),
            logic.caculated_price(order_data.price), 
            order_data.Notes,
            logic.formatDateToSQL(customer_data.entryDate)       
        ]);

        for(let i = 1; i<=order_data.No_of_Crates; i++){

            const newCrate = generateUUID();
            crateID.push(newCrate)
            await connection.query(insertCrateData, [
                newCrate,
                customerID,
                "Created",
                logic.formatDateToSQL(customer_data.entryDate),
                `${i}/${order_data.No_of_Crates}` //crate_order      
            ])
        }

        await connection.commit();
        connection.release()
        return crateID
    } catch (error) {
        await connection.rollback();
        console.error('Transaction error:', error);
        connection.release()
        console.log(error); 
        return false
    }
}


async function get_crate_data(crate_id) {
    const connection = await pool.getConnection()

    try{
        const CustomerData = `
        SELECT
        Customers.customer_id, Customers.name, Customers.city,
        Orders.weight_kg, Orders.crate_count, Orders.created_at,
        Crates.customer_id

        FROM Customers
        INNER JOIN Orders ON Customers.customer_id = Orders.customer_id
        INNER JOIN Crates ON Crates.customer_id = Orders.customer_id

        WHERE Crates.crate_id = ?
        `

        const CratesGroupData =`
        SELECT c.crate_id, c.crate_order
        FROM Crates c
        INNER JOIN Crates c2 ON c.customer_id = c2.customer_id
        WHERE c2.crate_id = ?
        `

        const customers_data_result = await connection.query(CustomerData, crate_id) 
        const crates_data_result = await connection.query(CratesGroupData, crate_id) 

        connection.commit()

        connection.release()
        if (customers_data_result[0].length === 0 || crates_data_result[0].length === 0){
            return false
        }
        return [customers_data_result[0], crates_data_result[0]]
    }
    catch(error){
        console.log(error)
        connection.rollback()
        connection.release()
        return false
    }

    
}

async function update_crates_status(crateIds, newStatus) {
    const connection = await pool.getConnection();

    try {
        if (!Array.isArray(crateIds) || crateIds.length === 0) {
            throw new Error('crateIds must be a non-empty array');
        }

        const placeholders = crateIds.map(() => '?').join(', ');
        const updateQuery = `
            UPDATE Crates
            SET status = ?
            WHERE crate_id IN (${placeholders})
        `;

        const params = [newStatus, ...crateIds];

        await connection.query(updateQuery, params);
        await connection.commit();
        connection.release();

        return true;
    } catch (error) {
        console.log(error);
        await connection.rollback();
        connection.release();
        return false;
    }
}

async function update_order_status(customer_id, new_status) {
    const connection = await pool.getConnection();

    try {
        const updateQuery = 
        `UPDATE Orders
        SET status = ?
        WHERE customer_id = ?
        ;`

        await connection.query(updateQuery, [new_status, customer_id]);

        await connection.commit();
        connection.release();

        return true;
    } catch (error) {
        console.log(error);
        await connection.rollback();
        connection.release();
        return false;
    }
}

async function getCustomers(customerName, page, limit) {
    const connection = await pool.getConnection();

    try {
        const parsedPage = page != null ? parseInt(page, 10) : 1;
        const parsedLimit = limit != null ? parseInt(limit, 10) : 10;
        const offset = (parsedPage - 1) * parsedLimit;

        const where = customerName ? `WHERE c.name LIKE ?` : '';
        const params = customerName ? [`%${customerName}%`] : [];

        // Get total count
        const countQuery = `SELECT COUNT(*) AS total FROM Orders AS o LEFT JOIN Customers AS c ON o.customer_id = c.customer_id ${where}`;
        const [[{ total }]] = await connection.query(countQuery, params);

        // Get paginated rows
        const dataQuery = `
            SELECT 
                o.customer_id, o.created_at, o.total_cost, o.weight_kg, o.status, o.crate_count, o.notes,
                c.name, c.email, c.phone, c.city
            FROM Orders AS o
            LEFT JOIN Customers AS c ON o.customer_id = c.customer_id
            ${where}
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const rows = await connection.query(
            dataQuery,
            [...params, parsedLimit, offset]
        );

        connection.release();

        return {
            rows: rows[0],
            total,
        };
    } catch (error) {
        console.error('Error fetching orders:', error);
        connection.release();
        throw error;
    }
}

async function delete_customer(customer_id) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const deleteCratesQuery = `DELETE FROM Crates WHERE customer_id = ?`;
        const deleteBoxesQuery = `DELETE FROM Boxes WHERE customer_id = ?`;
        const deleteOrdersQuery = `DELETE FROM Orders WHERE customer_id = ?`;
        const deleteCustomerQuery = `DELETE FROM Customers WHERE customer_id = ?`;

        await connection.query(deleteCratesQuery, [customer_id]);
        await connection.query(deleteBoxesQuery, [customer_id]);
        await connection.query(deleteOrdersQuery, [customer_id]);
        await connection.query(deleteCustomerQuery, [customer_id]);

        await connection.commit();
        connection.release();
        return true;

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Error deleting customer:', error);
        return false;
    }
}

async function insertCratesForCustomer(connection, customer_id, crateCount, updatedAt) {
    const insertQuery = `
        INSERT INTO Crates (crate_id, customer_id, status, created_at, crate_order)
        VALUES (?, ?, 'Created', ?, ?)
    `;

    for (let i = 1; i <= crateCount; i++) {
        const crateId = generateUUID();
        const crateOrder = `${i}/${crateCount}`;
        await connection.query(insertQuery, [crateId, customer_id, updatedAt, crateOrder]);
    }
}

async function updateCustomerData(customer_id, customerInfoChange, orderInfoChange) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // --- Prepare Customers update ---
        const customerFields = [];
        const customerValues = [];

        if (customerInfoChange.Name) {
        customerFields.push('name = ?');
        customerValues.push(customerInfoChange.Name);
        }
        if (customerInfoChange.email) {
        customerFields.push('email = ?');
        customerValues.push(customerInfoChange.email);
        }
        if (customerInfoChange.phone) {
        customerFields.push('phone = ?');
        customerValues.push(customerInfoChange.phone);
        }
        if (customerInfoChange.city) {
        customerFields.push('city = ?');
        customerValues.push(customerInfoChange.city);
        }

        if (customerFields.length > 0) {
        customerValues.push(customer_id);
        const customerQuery = `UPDATE Customers SET ${customerFields.join(', ')} WHERE customer_id = ?`;
        await connection.query(customerQuery, customerValues);
        }

        // --- Prepare Orders update ---
        const orderFields = [];
        const orderValues = [];

        if (orderInfoChange.Date) {
        orderFields.push('created_at = ?');
        orderValues.push(logic.formatDateToSQL(orderInfoChange.Date));
        }
        if (orderInfoChange.weight) {
        orderFields.push('weight_kg = ?');
        orderValues.push(Number(parseFloat(orderInfoChange.weight).toFixed(2)));

        // Also update total_cost based on weight if cost is not explicitly set
        if (!orderInfoChange.cost) {
            orderFields.push('total_cost = ?');
            orderValues.push(logic.caculated_price(orderInfoChange.weight));
        }
        }
        if (orderInfoChange.crate) {
        orderFields.push('crate_count = ?');
        orderValues.push(parseInt(orderInfoChange.crate));
        }
        if (orderInfoChange.cost) {
        orderFields.push('total_cost = ?');
        orderValues.push(Number(parseFloat(orderInfoChange.cost).toFixed(2)));
        }
        if (orderInfoChange.Status) {
        orderFields.push('status = ?');
        orderValues.push(orderInfoChange.Status);
        }
        if (orderInfoChange.Notes !== undefined) {
        orderFields.push('notes = ?');
        orderValues.push(orderInfoChange.Notes);
        }

        if (orderFields.length > 0) {
        orderValues.push(customer_id);
        const orderQuery = `UPDATE Orders SET ${orderFields.join(', ')} WHERE customer_id = ?`;
        await connection.query(orderQuery, orderValues);
        }

        // --- Handle crate updates ---
        if (orderInfoChange.crate) {
        // Delete all existing crates for this customer
        const deleteCratesQuery = `DELETE FROM Crates WHERE customer_id = ?`;
        await connection.query(deleteCratesQuery, [customer_id]);

        // Insert new crates matching the new crate count
        // Use updated date or today's date for updated_at
        const updatedAt = orderInfoChange.Date
            ? logic.formatDateToSQL(orderInfoChange.Date)
            : new Date().toISOString().slice(0, 10); // format 'YYYY-MM-DD'

        await insertCratesForCustomer(connection, customer_id, parseInt(orderInfoChange.crate), updatedAt);
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function get_crates_by_customer(customer_id) {
    const connection = await pool.getConnection();

    try {
        const query = `
        SELECT crate_id
        FROM Crates
        WHERE customer_id = ?
        ORDER BY crate_order
        `;

        const [rows] = await connection.query(query, [customer_id]);

        connection.release();

        return rows;  // Array of objects with crate_id
    } catch (error) {
        console.error('get_crates_by_customer error:', error);
        connection.release();
        return false;
    }
    }

async function getOrdersByStatus(status) {
    const [rows] = await pool.query(`
        SELECT 
            o.order_id,
            o.weight_kg,
            o.status,
            o.boxes_count,
            c.name
        FROM Orders o
        JOIN Customers c ON o.customer_id = c.customer_id
        WHERE o.status = ?
    `, [status]);

    return rows;
}

async function getPalletsByLocation(location, page, limit) {
    const connection = await pool.getConnection();

    try {
        const parsedPage = page != null ? parseInt(page, 10) : 1;
        const parsedLimit = limit != null ? parseInt(limit, 10) : 10;
        const offset = (parsedPage - 1) * parsedLimit;

        const whereClause = location ? `WHERE location LIKE ?` : '';
        const params = location ? [`%${location}%`] : [];

        // Get total count
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM Palletes
            ${whereClause}
        `;
        const [[{ total }]] = await connection.query(countQuery, params);

        // Get paginated rows
        const dataQuery = `
            SELECT pallete_id, location, capacity, holding, status
            FROM Palletes
            ${whereClause}
            ORDER BY location ASC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await connection.query(
            dataQuery,
            [...params, parsedLimit, offset]
        );

        connection.release();
        return {
            rows,
            total,
        };
    } catch (error) {
        console.error("Error fetching pallets by location:", error);
        connection.release();
        throw error;
    }
}


async function deletePallet(pallet_id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Unlink any boxes on this pallet to avoid FK issues
    await connection.query(
      `UPDATE Boxes SET pallet_id = NULL WHERE pallet_id = ?`,
      [pallet_id]
    );

    // Delete the pallet itself (
    const [result] = await connection.query(
      `DELETE FROM Pallets WHERE pallet_id = ?`,
      [pallet_id]
    );

    await connection.commit();
    return result.affectedRows > 0; // true if something was deleted
  } catch (err) {
    await connection.rollback();
    console.error("Error deleting pallet:", err);
    throw err;
  } finally {
    connection.release();
  }
}



async function updatePalletCapacity(pallete_id, newCapacity) {
    const connection = await pool.getConnection();

    try {
        const parsedCapacity = parseInt(newCapacity, 10);

        if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
            throw new Error('Invalid capacity input');
        }

        // Get current holding to ensure capacity >= holding
        const [[existing]] = await connection.query(
            'SELECT holding FROM Palletes WHERE pallete_id = ?',
            [pallete_id]
        );

        if (!existing) {
            throw new Error('Pallet not found');
        }

        if (existing.holding > parsedCapacity) {
            throw new Error(`New capacity (${parsedCapacity}) cannot be less than current holding (${existing.holding})`);
        }

        await connection.query(
        `UPDATE Palletes 
            SET capacity = ?, 
                status = CASE 
                    WHEN ? = holding THEN 'Full'
                    WHEN holding = 0 THEN 'Empty'
                    ELSE 'Available'
                END
            WHERE pallete_id = ?`,
            [parsedCapacity, parsedCapacity, pallete_id]
        );

        connection.release();
        return true;
    } catch (error) {
        console.error('Error updating pallet capacity:', error.message);
        connection.release();
        return false;
    }
}
async function markOrderAsReady(order_id) {
  const [res] = await pool.query(
    `
    UPDATE Orders
       SET status   = 'Ready for pickup',
           ready_at = COALESCE(ready_at, NOW())
     WHERE order_id = ?
       AND (status IS NULL OR status <> 'Picked up')
    `,
    [order_id]
  );
  return res.affectedRows || 0;
}

  async function markOrderAsDone(order_id, comment = "") {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
  
      // Lock order row
      const [[o]] = await conn.query(
        `SELECT order_id, customer_id, weight_kg
           FROM Orders
          WHERE order_id = ?
          FOR UPDATE`,
        [order_id]
      );
      if (!o) throw new Error("Order not found");
  
      // Compute how many boxes to make (same logic you use in the UI)
      const weight = Number(o.weight_kg) || 0;
      const estimatedPouches = Math.floor((weight * 0.65) / 3);
      const boxCount = Math.max(1, Math.ceil(estimatedPouches / 8));
  
      // Build suffixed ids
      const now = new Date();
      const rows = [];
      for (let i = 1; i <= boxCount; i++) {
        rows.push([`BOX_${order_id}_${i}`, o.customer_id, now]);
      }
  
      // Insert idempotently
      if (rows.length) {
        await conn.query(
          `INSERT IGNORE INTO Boxes (box_id, customer_id, created_at) VALUES ?`,
          [rows]
        );
      }
  
      // Authoritative count saved on Orders
      const actualCount = await updateBoxesCountForOrder(order_id, conn);
  
      // Status update
      await conn.query(
        `UPDATE Orders SET status = ? WHERE order_id = ?`,
        ["processing complete", order_id]
      );
  
      await conn.commit();
  
      // DEBUG (remove later): see what happened
      console.log(`[markOrderAsDone] order=${order_id} intended=${boxCount} saved=${actualCount}`);
  
      return {
        created: rows.length,       // attempted inserts
        boxes_count: actualCount,   // persisted total
        estimatedPouches,
        boxCount
      };
    } catch (e) {
      await conn.rollback();
      console.error("markOrderAsDone error:", e);
      throw e;
    } finally {
      conn.release();
    }
  }   
    
   
async function updateOrderInfo(order_id, data = {}) {
  // Map UI fields -> DB columns
  const sets = [];
  const vals = [];

  if (data.name != null)            { sets.push('name = ?');          vals.push(String(data.name)); }
  if (data.status != null)          { sets.push('status = ?');        vals.push(String(data.status)); }
  if (data.weight_kg != null)       { sets.push('weight_kg = ?');     vals.push(Number(data.weight_kg) || 0); }

  // UI sends these:
  if (data.estimated_pouches != null) { sets.push('pouches_count = ?'); vals.push(Number(data.estimated_pouches) || 0); }
  if (data.estimated_boxes != null)   { sets.push('boxes_count = ?');   vals.push(Number(data.estimated_boxes) || 0); }

  // If you also allow editing notes, etc., add them here similarly.

  if (sets.length === 0) {
    return { affectedRows: 0 }; // nothing to update
  }

  vals.push(order_id);
  const [res] = await pool.query(
    `UPDATE Orders SET ${sets.join(', ')} WHERE order_id = ?`,
    vals
  );
  return res;
}
      
      async function deleteOrder(order_id) {
        await pool.query("DELETE FROM Orders WHERE order_id = ?", [order_id]);
      }
      
      async function getPalletsByLocation(location) {
        const [rows] = await pool.query(
          `SELECT * FROM Pallets WHERE location = ? ORDER BY created_at DESC`,
          [location]
        );
        return rows;
      }
      
      async function createPallet(location, capacity) {
        const pallet_id = generateUUID(); // reuse your existing UUID function
        await pool.query(
          `INSERT INTO Pallets (pallet_id, location, status, capacity, holding, created_at)
           VALUES (?, ?, 'available', ?, 0, NOW())`,
          [pallet_id, location, capacity]
        );
        return pallet_id;
      }
      
      async function deleteShelf(shelf_id) {
        await pool.query(`DELETE FROM Shelves WHERE shelf_id = ?`, [shelf_id]);
      }

      async function getOrderById(order_id) {
        const [rows] = await pool.query(
          `SELECT o.*, c.name, c.phone, c.email
           FROM Orders o
           JOIN Customers c ON o.customer_id = c.customer_id
           WHERE o.order_id = ?`,
          [order_id]
        );
      
        return rows[0]; // single result
      }
      
      
      async function getPalletById(pallet_id) {
        const [rows] = await pool.query(`SELECT * FROM Pallets WHERE pallet_id = ?`, [pallet_id]);
        return rows[0] || null;
      }
      
     // Holding-safe
// Holding-safe + robust ID normalization
async function assignBoxToPallet(box_id_raw, pallet_id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const box_id = normalizeBoxId(box_id_raw);

    // lock the box row and read its current pallet
    const [[box]] = await connection.query(
      "SELECT pallet_id FROM Boxes WHERE box_id = ? FOR UPDATE",
      [box_id]
    );
    if (!box) {
      throw new Error(`Box not found: ${box_id_raw}`);
    }

    // lock the target pallet
    const [[target]] = await connection.query(
      "SELECT capacity, holding FROM Pallets WHERE pallet_id = ? FOR UPDATE",
      [pallet_id]
    );
    if (!target) throw new Error("Pallet not found");

    // already on this pallet? nothing to do
    if (box.pallet_id === pallet_id) {
      await connection.commit();
      return true;
    }

    // capacity check
    if (target.holding >= target.capacity) throw new Error("Pallet is full");

    // move the box
    const [upd] = await connection.query(
      "UPDATE Boxes SET pallet_id = ? WHERE box_id = ?",
      [pallet_id, box_id]
    );
    if (upd.affectedRows === 0) throw new Error("Box update failed");

    // decrement old pallet holding if moving from another pallet
    if (box.pallet_id) {
      await connection.query(
        `UPDATE Pallets
           SET holding = GREATEST(holding - 1, 0),
               status  = CASE WHEN holding - 1 <= 0 THEN 'available' ELSE status END
         WHERE pallet_id = ?`,
        [box.pallet_id]
      );
    }

    // increment target pallet and set status
    const newHolding = target.holding + 1;
    const newStatus = newHolding === target.capacity ? "full" : "available";
    await connection.query(
      "UPDATE Pallets SET holding = ?, status = ? WHERE pallet_id = ?",
      [newHolding, newStatus, pallet_id]
    );

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    console.error("Error assigning box to pallet:", err.message);
    return false;
  } finally {
    connection.release();
  }
}

async function updatePalletHolding(pallet_id, connOrPool = pool) {
  const [[{ cnt }]] = await connOrPool.query(
    `SELECT COUNT(*) AS cnt FROM Boxes WHERE pallet_id = ?`,
    [pallet_id]
  );

  const holding = Number(cnt || 0);

  await connOrPool.query(
    `
    UPDATE Pallets
       SET holding = ?,
           status = CASE
                      WHEN ? = 0 THEN 'available'
                      WHEN capacity <= ? THEN 'full'
                      ELSE 'loading'
                    END
     WHERE pallet_id = ?
    `,
    [holding, holding, holding, pallet_id]
  );

  return holding;
}



      async function searchOrdersForPickup(query) {
        const [rows] = await pool.query(`
          SELECT 
            o.order_id,
            o.status,
            o.customer_id,
            o.created_at,
            c.name,
            c.phone,
            c.city,
            (
              SELECT COUNT(*) 
              FROM Boxes b 
              WHERE b.customer_id = o.customer_id
            ) AS box_count
          FROM Orders o
          JOIN Customers c ON o.customer_id = c.customer_id
          WHERE c.name LIKE ? OR c.phone LIKE ?
          ORDER BY o.created_at DESC
        `, [`%${query}%`, `%${query}%`]);
      
        return rows;
      }
      
      
      async function markOrderAsPickedUp(order_id) {
        await pool.query(
          `UPDATE Orders SET status = 'Picked up' WHERE order_id = ?`,
          [order_id]
        );
      }


async function searchOrdersWithShelfInfo(query) {
  const like = `%${query}%`;

  const [rows] = await pool.query(
    `
    SELECT
      o.order_id,
      o.status,
      o.customer_id,
      o.created_at,
      c.name,
      c.phone,
      c.city,

      /* prefer persisted count; otherwise count distinct boxes for this order */
      COALESCE(o.boxes_count, COUNT(DISTINCT b.box_id)) AS box_count,

      /* shelf via pallet OR via box (Kuopio) */
      COALESCE(MAX(sp.shelf_name), MAX(sb.shelf_name))   AS shelf_name,
      COALESCE(MAX(sp.location),   MAX(sb.location))     AS shelf_location

    FROM Orders o
    JOIN Customers c
      ON c.customer_id = o.customer_id

    /* Link boxes that belong to this order (parse BOX_<orderUUID>_n) */
    LEFT JOIN Boxes b
      ON SUBSTRING(b.box_id, 5, 36) = o.order_id

    /* Normal flow: boxes -> pallet -> shelf */
    LEFT JOIN Pallets p
      ON p.pallet_id = b.pallet_id
    LEFT JOIN Shelves sp
      ON sp.shelf_id = p.shelf_id

    /* Kuopio flow: boxes -> shelf directly */
    LEFT JOIN Shelves sb
      ON sb.shelf_id = b.shelf_id

    WHERE c.name  LIKE ?
       OR c.phone LIKE ?

    GROUP BY
      o.order_id, o.status, o.customer_id, o.created_at,
      c.name, c.phone, c.city, o.boxes_count

    ORDER BY o.created_at DESC
    `,
    [like, like]
  );

  return rows;
}

      
      
      async function getAllCities() {
        const [rows] = await pool.query("SELECT * FROM cities");
        return rows;
      }

      async function getAllShelfLocations() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query('SELECT DISTINCT location FROM Shelves');
            return rows;
        } catch (error) {
            console.error("Error getting shelf locations:", error);
            return [];
        } finally {
            connection.release();
        }
    }
    

    async function createShelf(location, capacity = 4, shelfName = null) {
      const connection = await pool.getConnection();
      try {
        if (!location || capacity == null) throw new Error("Missing required parameters");
    
        // Auto-number within the same location if no name given
        const [[{ cnt }]] = await connection.query(
          'SELECT COUNT(*) AS cnt FROM Shelves WHERE location = ?',
          [location]
        );
        const shelf_name = shelfName && shelfName.trim()
          ? shelfName.trim()
          : `Shelf ${cnt + 1}`;
    
        const shelf_id = generateUUID();
        await connection.query(
          'INSERT INTO Shelves (shelf_id, location, shelf_name, status, capacity, holding, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [shelf_id, location, shelf_name, "Empty", capacity, 0, new Date()]
        );
        return { shelf_id, shelf_name };
      } finally {
        connection.release();
      }
    }
    

  // Get all unique shelf locations
async function getShelvesByLocation(location) {
  const [rows] = await pool.query("SELECT * FROM Shelves WHERE location = ?", [location]);
  return rows;
}


async function getBoxesByPalletId(pallet_id) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `
      SELECT 
        b.box_id,
        b.customer_id,
        c.name AS customer_name,
        (
          SELECT o.order_id 
          FROM Orders o 
          WHERE o.customer_id = b.customer_id 
          ORDER BY o.created_at DESC 
          LIMIT 1
        ) AS order_id,
        b.created_at
      FROM Boxes b
      JOIN Customers c ON c.customer_id = b.customer_id
      WHERE b.pallet_id = ?
      ORDER BY b.created_at DESC
      `,
      [pallet_id]
    );
    return rows;
  } finally {
    connection.release();
  }
}

  async function assignPalletToShelf(palletId, shelfId) {
    const connection = await pool.getConnection();
  
    try {
      await connection.beginTransaction();
  
      // Check shelf capacity
      const [shelfRows] = await connection.query(
        `SELECT capacity, holding FROM Shelves WHERE shelf_id = ?`,
        [shelfId]
      );
  
      if (shelfRows.length === 0) {
        throw new Error("Shelf not found");
      }
  
      const { capacity, holding } = shelfRows[0];
  
      if (holding >= capacity) {
        throw new Error("Shelf is full");
      }
  
      // Assign pallet to shelf
      await connection.query(
        `UPDATE Pallets SET shelf_id = ? WHERE pallet_id = ?`,
        [shelfId, palletId]
      );
  
      // Increment shelf holding count
      await connection.query(
        `UPDATE Shelves SET holding = holding + 1 WHERE shelf_id = ?`,
        [shelfId]
      );
  
      await connection.commit();
      return { palletId, shelfId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  async function getShelfById(shelfId) {
    const [rows] = await pool.query(
      `SELECT location, shelf_name FROM Shelves WHERE shelf_id = ?`,
      [shelfId]
    );
    return rows[0] || null;
  }
  
  async function getCustomersByPalletId(palletId) {
    const [rows] = await pool.query(
      `SELECT DISTINCT
           c.customer_id,
           c.name,
           c.phone,
           c.city
         FROM Boxes b
         JOIN Customers c ON b.customer_id = c.customer_id
        WHERE b.pallet_id = ?`,
      [palletId]
    );
    return rows;
  }
  
  async function getCustomerById(customer_id) {
    const [rows] = await pool.query(
      `SELECT customer_id, name, phone, email, city
         FROM Customers
        WHERE customer_id = ?
        LIMIT 1`,
      [customer_id]
    );
    return rows[0] || null;
  }

// Preferred source of truth for "expected": Orders.boxes_count,
// falling back to a live count if it’s 0/NULL (safety).
async function getExpectedBoxesForOrder(order_id) {
  const [[row]] = await pool.query(
    "SELECT boxes_count FROM Orders WHERE order_id = ?",
    [order_id]
  );
  const stored = row?.boxes_count != null ? Number(row.boxes_count) : 0;
  if (!Number.isNaN(stored) && stored > 0) return stored;

  // Fallback: compute now and persist
  return await updateBoxesCountForOrder(order_id);
}

// Normalize any scanned box code to canonical "BOX_<uuid>" or "BOX_<uuid>_<n>"
function normalizeBoxId(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/([0-9a-fA-F-]{36})(?:_(\d+))?/); // uuid + optional _n anywhere
  if (m) return `BOX_${m[1]}${m[2] ? `_${m[2]}` : ""}`;
  if (/^BOX[\s:\-_]/i.test(s)) {
    const t = s.replace(/^BOX[\s:\-_]*/i, "BOX_");
    return t.replace(/^BOX__/, "BOX_"); // collapse accidental double _
  }
  return s.startsWith("BOX_") ? s : s;
}

function extractOrderIdFromBoxId(box_id) {
  const m = String(box_id).match(/^BOX_([0-9a-fA-F-]{36})(?:_(\d+))?$/i);
  return m ? m[1] : null;
}

// Fallback: find an order for this box via its customer_id
async function findOrderIdForBox(box_id) {
  const [[bx]] = await pool.query(
    "SELECT customer_id FROM Boxes WHERE box_id = ?",
    [box_id]
  );
  if (!bx) return null;

  // Prefer the most recent order for this customer
  const [[ord]] = await pool.query(
    `SELECT o.order_id
       FROM Orders o
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
      LIMIT 1`,
    [bx.customer_id]
  );
  return ord?.order_id ?? null;
}

// Count BOX_<order_id>_% in Boxes, store result on Orders.boxes_count, return the count
// Count boxes for an order (prefers suffixed; falls back to unsuffixed; then customer)
async function updateBoxesCountForOrder(order_id, connOrPool = pool) {
  // count suffixed: BOX_<order>_1, _2, ...
  const [[{ cnt: suf }]] = await connOrPool.query(
    `SELECT COUNT(*) AS cnt
       FROM Boxes
      WHERE box_id REGEXP CONCAT('^BOX_', ?, '_[0-9]+$')`,
    [order_id]
  );
  let count = Number(suf || 0);

  // if no suffixed, check a single unsuffixed row
  if (count === 0) {
    const [[{ cnt: unsuf }]] = await connOrPool.query(
      `SELECT COUNT(*) AS cnt
         FROM Boxes
        WHERE box_id = CONCAT('BOX_', ?)`,
      [order_id]
    );
    count = Number(unsuf || 0);
  }

  // optional safety: fall back to Boxes.customer_id if still zero
  if (count === 0) {
    const [[ord]] = await connOrPool.query(
      `SELECT customer_id FROM Orders WHERE order_id = ?`,
      [order_id]
    );
    if (ord?.customer_id) {
      const [[{ cnt: byCustomer }]] = await connOrPool.query(
        `SELECT COUNT(*) AS cnt FROM Boxes WHERE customer_id = ?`,
        [ord.customer_id]
      );
      count = Number(byCustomer || 0);
    }
  }

  await connOrPool.query(
    `UPDATE Orders SET boxes_count = ? WHERE order_id = ?`,
    [count, order_id]
  );
  return count;
}

// Prefer Orders.boxes_count; if zero, recompute and persist
async function getExpectedBoxesForOrder(order_id) {
  const [[row]] = await pool.query(
    "SELECT boxes_count FROM Orders WHERE order_id = ?",
    [order_id]
  );
  const stored = row?.boxes_count != null ? Number(row.boxes_count) : 0;
  if (stored > 0) return stored;
  return await updateBoxesCountForOrder(order_id);
}
       
// Get scan info for a box by its ID, returning order and boxes summary
async function getScanInfoByBoxId(box_id_raw) {
 
  const normalizeBoxId = (raw) => {
    const s = String(raw || "").trim();
    const m = s.match(/([0-9a-fA-F-]{36})(?:_(\d+))?/); // uuid + optional _n anywhere
    if (m) return `BOX_${m[1]}${m[2] ? `_${m[2]}` : ""}`;
    if (/^BOX[\s:\-_]/i.test(s)) {
      const t = s.replace(/^BOX[\s:\-_]*/i, "BOX_");
      return t.replace(/^BOX__/, "BOX_");
    }
    return s.startsWith("BOX_") ? s : s;
  };
  const extractOrderIdFromBoxId = (boxId) => {
    const m = String(boxId).match(/^BOX_([0-9a-fA-F-]{36})(?:_(\d+))?$/i);
    return m ? m[1] : null;
  };

  const box_id = normalizeBoxId(box_id_raw);

  // 1) Resolve order_id: try from the box_id; else via the box's customer_id -> latest order
  let order_id = extractOrderIdFromBoxId(box_id);
  if (!order_id) {
    // find the box's customer
    const [[bx]] = await pool.query(
      "SELECT customer_id FROM Boxes WHERE box_id = ?",
      [box_id]
    );
    if (!bx) throw new Error("Order not found for this box");
    const [[ord]] = await pool.query(
      `SELECT o.order_id
         FROM Orders o
        WHERE o.customer_id = ?
        ORDER BY o.created_at DESC
        LIMIT 1`,
      [bx.customer_id]
    );
    order_id = ord?.order_id || null;
  }
  if (!order_id) throw new Error("Order not found for this box");

  // 2) Fetch order + customer summary
  const [[order]] = await pool.query(
    `
    SELECT 
      o.order_id,
      o.customer_id,
      o.created_at,
      o.weight_kg,
      COALESCE(o.boxes_count, 0) AS boxes_count,
      c.name,
      c.city
    FROM Orders o
    JOIN Customers c ON c.customer_id = o.customer_id
    WHERE o.order_id = ?
    `,
    [order_id]
  );
  if (!order) throw new Error("Order not found");

  // 3) Ensure boxes_count is accurate (auto-heal from DB if 0)
  if (!order.boxes_count || Number(order.boxes_count) === 0) {
    if (typeof updateBoxesCountForOrder === "function") {
      order.boxes_count = await updateBoxesCountForOrder(order_id);
    }
  }

  // 4) List boxes for this order.
  //    Prefer suffixed rows (BOX_<order>_n). If none exist, fall back to the single unsuffixed row.
  const [[{ cnt: suf }]] = await pool.query(
    `SELECT COUNT(*) AS cnt
       FROM Boxes
      WHERE box_id REGEXP CONCAT('^BOX_', ?, '_[0-9]+$')`,
    [order_id]
  );

  let boxes = [];
  if (Number(suf || 0) > 0) {
    // return the suffixed set
    const [rows] = await pool.query(
      `SELECT box_id
         FROM Boxes
        WHERE box_id REGEXP CONCAT('^BOX_', ?, '_[0-9]+$')
        ORDER BY box_id`,
      [order_id]
    );
    boxes = rows;
  } else {
    // fall back to unsuffixed single row (if present)
    const [rows] = await pool.query(
      `SELECT box_id
         FROM Boxes
        WHERE box_id = CONCAT('BOX_', ?)
        ORDER BY box_id`,
      [order_id]
    );
    boxes = rows;
  }

  return { order, boxes }; // { order: {...}, boxes: [{box_id}, ...] }
}

async function assignBoxesToPallet(pallet_id, box_ids = []) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Normalize and dedupe IDs
    const ids = Array.from(
      new Set(
        (Array.isArray(box_ids) ? box_ids : [])
          .filter(Boolean)
          .map((s) => String(s).trim())
      )
    );

    if (ids.length === 0) {
      const holding = await updatePalletHolding(pallet_id, conn);
      await conn.commit();
      return { assigned: 0, holding };
    }

    const placeholders = ids.map(() => "?").join(", ");

    const [result] = await conn.query(
      `UPDATE Boxes
          SET pallet_id = ?
        WHERE box_id IN (${placeholders})`,
      [pallet_id, ...ids]
    );

    const assigned = Number(result.affectedRows || 0);

    const holding = await updatePalletHolding(pallet_id, conn);

    await conn.commit();
    return { assigned, holding };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// Backend (./source/database_fns.js)
async function getBoxesOnPallet(pallet_id) {
  const [rows] = await pool.query(
    `
    SELECT
      b.box_id,
      b.created_at,
      b.customer_id,
      c.name AS customer_name,
      CASE
        WHEN b.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}' THEN SUBSTRING(b.box_id, 5, 36)
        ELSE NULL
      END AS order_id
    FROM Boxes b
    LEFT JOIN Customers c ON c.customer_id = b.customer_id
    WHERE b.pallet_id = ?
    ORDER BY b.box_id
    `,
    [pallet_id]
  );
  return rows;
}

// Mark all orders that have boxes on a given pallet as 'Ready for pickup'.
// Uses order_id derived from BOX_<order_uuid>[_n]; falls back to customer join if needed.
async function markOrdersOnPalletReady(palletId) {
  // 1) Extract order_ids from BOX_ pattern
  const [orderRows] = await pool.query(
    `
    SELECT DISTINCT SUBSTRING(b.box_id, 5, 36) AS order_id
    FROM Boxes b
    WHERE b.pallet_id = ?
      AND b.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}'
    `,
    [palletId]
  );
  const ids = orderRows.map(r => r.order_id).filter(Boolean);

  let updatedByOrderId = 0;
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(', ');
    const [res] = await pool.query(
      `
      UPDATE Orders
         SET status   = 'Ready for pickup',
             ready_at = COALESCE(ready_at, NOW())
       WHERE order_id IN (${placeholders})
         AND (status IS NULL OR status <> 'Picked up')
      `,
      ids
    );
    updatedByOrderId = res.affectedRows || 0;
  }

  // 2) Fallback: link via customer_id if none matched the BOX_ pattern
  if (updatedByOrderId === 0) {
    const [res2] = await pool.query(
      `
      UPDATE Orders o
      JOIN Boxes  b ON b.customer_id = o.customer_id
                   AND b.pallet_id   = ?
         SET o.status   = 'Ready for pickup',
             o.ready_at = COALESCE(o.ready_at, NOW())
       WHERE (o.status IS NULL OR o.status <> 'Picked up')
      `,
      [palletId]
    );
    return { updated: res2.affectedRows || 0, orderIds: [] };
  }

  return { updated: updatedByOrderId, orderIds: ids };
}

// helper unchanged
function pctChange(today, yesterday) {
  if (!yesterday || Number(yesterday) === 0) return today > 0 ? 100 : 0;
  return Number((((Number(today) - Number(yesterday)) / Number(yesterday)) * 100).toFixed(1));
}

async function getDashboardSummary() {
  // Today
  const [[{ boxes_today }]] = await pool.query(
    `SELECT COUNT(*) AS boxes_today FROM Boxes WHERE DATE(created_at) = CURDATE()`
  );
  const [[{ crates_today }]] = await pool.query(
    `SELECT COUNT(*) AS crates_today FROM Crates WHERE DATE(created_at) = CURDATE()`
  );
  const [[{ customers_today }]] = await pool.query(
    `SELECT COUNT(*) AS customers_today FROM Customers WHERE DATE(created_at) = CURDATE()`
  );
  const [[{ orders_new_today }]] = await pool.query(
    `SELECT COUNT(*) AS orders_new_today FROM Orders WHERE DATE(created_at) = CURDATE()`
  );

  // Yesterday
  const [[{ boxes_yesterday }]] = await pool.query(
    `SELECT COUNT(*) AS boxes_yesterday FROM Boxes WHERE DATE(created_at) = (CURDATE() - INTERVAL 1 DAY)`
  );
  const [[{ crates_yesterday }]] = await pool.query(
    `SELECT COUNT(*) AS crates_yesterday FROM Crates WHERE DATE(created_at) = (CURDATE() - INTERVAL 1 DAY)`
  );
  const [[{ customers_yesterday }]] = await pool.query(
    `SELECT COUNT(*) AS customers_yesterday FROM Customers WHERE DATE(created_at) = (CURDATE() - INTERVAL 1 DAY)`
  );
  const [[{ orders_new_yesterday }]] = await pool.query(
    `SELECT COUNT(*) AS orders_new_yesterday FROM Orders WHERE DATE(created_at) = (CURDATE() - INTERVAL 1 DAY)`
  );

  // Snapshots
  const [[{ active_orders }]] = await pool.query(
    `SELECT COUNT(*) AS active_orders
       FROM Orders
      WHERE status IS NULL OR status <> 'Picked up'`
  );
  const [[{ customers_served }]] = await pool.query(
    `SELECT COUNT(*) AS customers_served FROM Customers`
  );

  // Uses ready_at if present, else updated_at, else created_at
  const [[{ orders_fulfilled_today }]] = await pool.query(
    `SELECT COUNT(*) AS orders_fulfilled_today
       FROM Orders
      WHERE status IN ('Ready for pickup','Picked up')
        AND DATE(COALESCE(ready_at, created_at)) = CURDATE()`
  );

  // Metrics
  const daily_production_liters   = Number(boxes_today || 0) * 8;
  const daily_production_liters_y = Number(boxes_yesterday || 0) * 8;
  const eff_today = crates_today    ? (Number(boxes_today || 0) / Number(crates_today)) * 100 : 0;
  const eff_yday  = crates_yesterday? (Number(boxes_yesterday || 0) / Number(crates_yesterday)) * 100 : 0;

  const changes = {
    daily_production_pct:      pctChange(daily_production_liters, daily_production_liters_y),
    active_orders_pct:         pctChange(Number(orders_new_today || 0), Number(orders_new_yesterday || 0)),
    customers_served_pct:      pctChange(Number(customers_today || 0), Number(customers_yesterday || 0)),
    processing_efficiency_pct: Number((eff_today - eff_yday).toFixed(1)),
  };

  return {
    daily_production_liters,
    active_orders: Number(active_orders || 0),
    customers_served: Number(customers_served || 0),
    processing_efficiency: Number(eff_today.toFixed(1)),
    overview: {
      juice_liters: daily_production_liters,
      crates_processed: Number(crates_today || 0),
      orders_fulfilled: Number(orders_fulfilled_today || 0), // ← tweaked
    },
    changes,
  };
}


// ----- Recent activity for dashboard/notifications -----
async function getRecentActivity(limit = 20) {
  limit = Math.max(1, Math.min(100, Number(limit || 20)));
  const [rows] = await pool.query(
    `
    SELECT * FROM (
      -- new customer created
      SELECT c.created_at AS ts,
             CONCAT('New customer registered - ', c.name) AS message,
             'customer' AS type
        FROM Customers c

      UNION ALL
      -- processing completed (boxes created)
      SELECT b.created_at AS ts,
             CONCAT('Juice processing completed - ', cu.name) AS message,
             'processing' AS type
        FROM Boxes b
        LEFT JOIN Customers cu ON b.customer_id = cu.customer_id

      UNION ALL
      -- pallet created
      SELECT p.created_at AS ts,
             CONCAT('Pallet created - ', IFNULL(p.location,'')) AS message,
             'warehouse' AS type
        FROM Pallets p
    ) t
    WHERE ts IS NOT NULL
    ORDER BY ts DESC
    LIMIT ?
    `,
    [limit]
  );
  return rows;
}


// --- KUOPIO HELPERS ---

// Put specific boxes onto a shelf (clear pallet_id if present)
async function assignBoxesToShelf(shelfId, boxIds) {
  if (!shelfId || !Array.isArray(boxIds) || boxIds.length === 0) {
    return { updated: 0 };
  }

  // Use the exact scanned IDs (they include suffix _1, _2, ...)
  const unique = Array.from(new Set(boxIds.map(String)));
  const placeholders = unique.map(() => "?").join(", ");

  const [res] = await pool.query(
    `UPDATE Boxes SET shelf_id = ?, pallet_id = NULL WHERE box_id IN (${placeholders})`,
    [shelfId, ...unique]
  );

  return { updated: res.affectedRows || 0 };
}


// Mark orders as "Ready for pickup" based on an array of scanned box IDs.
async function markOrdersFromBoxesReady(boxIds) {
  try {
    if (!Array.isArray(boxIds) || boxIds.length === 0) {
      return { updated: 0, orderIds: [] };
    }

    // Extract order UUIDs from the scanned box strings
    const orderIds = Array.from(new Set(
      boxIds
        .map(id => {
          const m = String(id).match(/BOX_([0-9A-Fa-f-]{36})/);
          return m ? m[1] : null;
        })
        .filter(Boolean)
    ));

    if (orderIds.length === 0) {
      return { updated: 0, orderIds: [] };
    }

    const placeholders = orderIds.map(() => "?").join(", ");
    const [res] = await pool.query(
      `UPDATE Orders SET status = 'Ready for pickup' WHERE order_id IN (${placeholders})`,
      orderIds
    );

    return { updated: res.affectedRows || 0, orderIds };
  } catch (e) {
    console.error("markOrdersFromBoxesReady failed:", e);
    throw e;
  }
}

// Fetch distinct customers for a set of box_ids (to send SMS)
// Fetch distinct customers for a set of boxes via Boxes.customer_id
async function getCustomersByBoxIds(boxIds) {
  if (!Array.isArray(boxIds) || boxIds.length === 0) return [];

  const unique = Array.from(new Set(boxIds.map(String)));
  const placeholders = unique.map(() => "?").join(", ");

  const [rows] = await pool.query(
    `
    SELECT DISTINCT c.customer_id, c.name, c.phone
      FROM Boxes b
      JOIN Customers c ON c.customer_id = b.customer_id
     WHERE b.box_id IN (${placeholders})
    `,
    unique
  );

  return rows || [];
}

async function checkPassword(id, inputPassword) {
    try {
        const [rows] = await pool.query(
            "SELECT password FROM Accounts WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return false; // Account not found
        }

        const storedPassword = rows[0].password;
        return storedPassword === inputPassword;
    } catch (error) {
        console.error("Error checking password:", error);
        return false;
    }
}


// source/database_fns.js
// ...existing connection setup + helpers...

async function ping() {
  // use whatever low-level call you already use internally
  if (typeof query === 'function') {
    await query('SELECT 1');
  } else if (pool?.query) {
    await pool.query('SELECT 1');
  } else if (conn?.query) {
    await conn.query('SELECT 1');
  } else {
    throw new Error('No underlying query function available for ping()');
  }
}

async function getAllCities() {
    try {
        const [rows] = await pool.query('SELECT * FROM Cities');
        return rows;
    } catch (err) {
        throw err;
    }
}


async function updateAdminPassword(adminId, newPassword) {
    const sql = `UPDATE Accounts SET password = ? WHERE id = ?`;
    try {
        await pool.query(sql, [newPassword, adminId]); // store plain string
    } catch (err) {
        throw err;
    }
}
async function updateEmployeePassword(newPassword) {
  console.log("testing employee password update");
    const sql = `UPDATE Accounts SET password = ? WHERE id = "employee"`;
    try {
        await pool.query(sql, [newPassword]); // store plain string
    } catch (err) {
        throw err;
    }
}


async function addCities(cities) {
    if (!cities || !cities.length) return;

    const placeholders = cities.map(() => '(?)').join(',');
    const sql = `
        INSERT INTO Cities (name)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE name = name
    `;

    try {
        await pool.query(sql, cities);
    } catch (err) {
        throw err;
    }
}


// --- Shelves: details + contents -------------------------------------------
async function getShelfDetails(shelfId) {
  const [rows] = await pool.query(
    `SELECT shelf_id, shelf_name, location, status, capacity, holding, created_at
       FROM Shelves
      WHERE shelf_id = ?
      LIMIT 1`,
    [shelfId]
  );
  return rows[0] || null;
}

async function getShelfContents(shelfId) {
  const [rows] = await pool.query(
    `SELECT 
        b.box_id,
        b.customer_id,
        b.city,
        b.pallet_id,
        b.shelf_id,
        b.pouch_count,
        b.created_at
       FROM Boxes b
      WHERE b.shelf_id = ?
         OR b.pallet_id IN (SELECT p.pallet_id FROM Pallets p WHERE p.shelf_id = ?)
      ORDER BY b.created_at DESC`,
    [shelfId, shelfId]
  );
  return rows;
}
async function getOrderStatus(order_id) {
  const [rows] = await pool.query(
    `SELECT status /*, is_done */ FROM Orders WHERE order_id = ? LIMIT 1`,
    [order_id]
  );
  return rows[0] || null;
}

async function getPalletBoxes(palletId) {
  const [rows] = await pool.query(
    `
    SELECT
      b.box_id,
      b.customer_id,
      CASE
        WHEN b.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}'
          THEN SUBSTRING(b.box_id, 5, 36)
        ELSE NULL
      END AS order_id
    FROM Boxes b
    WHERE b.pallet_id = ?
    `,
    [palletId]
  );
  return rows;
}

async function getOrdersOnPallet(palletId) {
  const [rows] = await pool.query(
    `
    SELECT
      o.order_id,
      o.status,
      o.customer_id,
      c.name,
      c.city,
      COUNT(*) AS box_count
    FROM Boxes b
    JOIN Orders o
      ON o.order_id = SUBSTRING(b.box_id, 5, 36)
    LEFT JOIN Customers c
      ON c.customer_id = o.customer_id
    WHERE b.pallet_id = ?
      AND b.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}'
    GROUP BY o.order_id, o.status, o.customer_id, c.name, c.city
    ORDER BY MIN(b.created_at) ASC
    `,
    [palletId]
  );
  return rows;
}

async function getPalletBoxes(palletId) {
  const [rows] = await pool.query(
    `
    SELECT
      b.box_id,
      b.customer_id,
      b.city,
      b.pallet_id,
      b.created_at,
      b.pouch_count,
      b.shelf_id,
      /* Derive order id from the QR pattern when available */
      CASE
        WHEN b.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}(_|$)'
          THEN SUBSTRING(b.box_id, 5, 36)
        ELSE NULL
      END AS order_id
    FROM Boxes b
    WHERE b.pallet_id = ?
    ORDER BY b.created_at DESC
    `,
    [palletId]
  );
  return rows;
}


async function getOrdersOnPallet(palletId) {
  const [rows] = await pool.query(
    `
    /* From encoded order id in box_id */
    SELECT DISTINCT
      o.order_id,
      c.name,
      c.city,
      o.status,
      o.created_at
    FROM Boxes b
    JOIN Orders o
      ON o.order_id = SUBSTRING(b.box_id, 5, 36)
    LEFT JOIN Customers c
      ON c.customer_id = o.customer_id
    WHERE b.pallet_id = ?
      AND b.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}(_|$)'

    UNION

    /* Fallback: from customer linkage (older boxes) */
    SELECT DISTINCT
      o.order_id,
      c.name,
      c.city,
      o.status,
      o.created_at
    FROM Boxes b
    JOIN Orders o
      ON o.customer_id = b.customer_id
    LEFT JOIN Customers c
      ON c.customer_id = o.customer_id
    WHERE b.pallet_id = ?
      AND b.box_id NOT REGEXP '^BOX_[0-9A-Fa-f-]{36}(_|$)'

    ORDER BY created_at DESC
    `,
    [palletId, palletId]
  );
  return rows;
}
// ───────────────── SMS STATUS HELPERS (customer-centric) ─────────────────

/**
 * Return a single customer's SMS status or a default "not_sent" object.
 */
async function getSmsStatusForCustomer(customerId) {
  const [rows] = await pool.query(
    `SELECT customer_id, sent_count, last_status, updated_at
       FROM SmsStatus
      WHERE customer_id = ?`,
    [customerId]
  );
  if (rows.length) return rows[0];
  return {
    customer_id: customerId,
    sent_count: 0,
    last_status: 'not_sent',
    updated_at: null,
  };
}

async function getSmsStatusForCustomer(customerId) {
  const [rows] = await pool.query(
    `SELECT customer_id, sent_count, last_status, updated_at
     FROM SmsStatus
     WHERE customer_id = ?`,
    [customerId]
  );
  if (rows.length) return rows[0];
  return { customer_id: customerId, sent_count: 0, last_status: 'not_sent', updated_at: null };
}

async function incrementSmsSent(customerId) {
  await pool.query(
    `INSERT INTO SmsStatus (customer_id, sent_count, last_status)
     VALUES (?, 1, 'sent')
     ON DUPLICATE KEY UPDATE
       sent_count = sent_count + 1,
       last_status = 'sent',
       updated_at = CURRENT_TIMESTAMP`,
    [customerId]
  );
}

async function markSmsSkipped(customerId) {
  await pool.query(
    `INSERT INTO SmsStatus (customer_id, sent_count, last_status)
     VALUES (?, 0, 'not_sent')
     ON DUPLICATE KEY UPDATE
       last_status = 'not_sent',
       updated_at = CURRENT_TIMESTAMP`,
    [customerId]
  );
}

// --- Daily totals: liters + customers served (distinct) per day -------------
async function getDailyTotals(days = 30) {
  const n = Math.max(1, Math.min(365, Number(days) || 30));

  const [rows] = await pool.query(
    `
    SELECT
      DATE(b.created_at) AS d,
      COUNT(*)           AS boxes,
      COUNT(DISTINCT b.customer_id) AS customers
    FROM Boxes b
    WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(b.created_at)
    ORDER BY d DESC
    `,
    [n]
  );

  const toDateStr = (x) => (x instanceof Date ? x.toISOString().slice(0,10) : String(x));

  return rows.map(r => ({
    date: toDateStr(r.d),
    total_liters: Number(r.boxes || 0) * 8,          // same 1 box = 8L assumption as summary
    total_customers: Number(r.customers || 0),
  }));
}

function normalizePhone(raw) {
  if (!raw) return '';
  // normalize to digits + leading '+'
  let p = String(raw).trim();
  p = p.replace(/\s+/g, '');
  p = p.replace(/[()\-]/g, '');
  // if it doesn't start with '+' but looks like international, leave as is; otherwise just keep digits
  // (for true E.164 use libphonenumber in production)
  return p.startsWith('+') ? p : p.replace(/[^\d]/g, '');
}

function makeIdempotencyKey({ shelfId, boxes = [], customers = [] }) {
  const phones = customers
    .map(c => normalizePhone(c?.phone))
    .filter(Boolean)
    .sort();
  const sortedBoxes = [...boxes].sort();
  return `load-boxes:${shelfId}:${sortedBoxes.join(',')}:${phones.join(',')}`;
}

module.exports = {
    updateAdminPassword,
    addCities,
    getAllCities,
    checkPassword,
    update_new_customer_data, 
    get_crate_data, 
    update_crates_status, 
    update_order_status, 
    getCustomers,
    delete_customer,
    updateCustomerData,
    get_crates_by_customer,
    getOrdersByStatus,
    markOrderAsDone,
    updateOrderInfo,
    deleteOrder,
    getPalletsByLocation,
    createPallet,
    deleteShelf,
    deletePallet,
    updatePalletCapacity,
    getOrderById,
    getPalletById,
    assignBoxToPallet,
    markOrderAsReady,
    searchOrdersForPickup,
    markOrderAsPickedUp,
    searchOrdersWithShelfInfo,
    getAllCities,
    getShelvesByLocation,
    createShelf,
    getAllShelfLocations,
    getBoxesByPalletId,
    assignPalletToShelf,
    getShelfById,
    getCustomersByPalletId,
    getPalletsByLocation,
    normalizeBoxId,
    getExpectedBoxesForOrder,
    extractOrderIdFromBoxId,
    findOrderIdForBox,
    getScanInfoByBoxId,
    updateBoxesCountForOrder,
    assignBoxesToPallet,
    updatePalletHolding,
    getBoxesOnPallet,
    markOrdersOnPalletReady,
    getDashboardSummary,
    getRecentActivity,
    assignBoxesToShelf,
    markOrdersFromBoxesReady,
    getCustomersByBoxIds,
    getCustomerById,
    ping,
    getShelfContents,
    getShelfDetails,
    getOrderStatus,
    getPalletBoxes,
    getOrdersOnPallet,
    getSmsStatusForCustomer,
    incrementSmsSent,
    markSmsSkipped,
    updateEmployeePassword,
    getDailyTotals,
    makeIdempotencyKey,
    pctChange,
}

module.exports.pool = pool;