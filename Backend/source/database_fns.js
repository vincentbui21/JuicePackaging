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

            const newCrateId = `CRATE_${orderID}_${i}`;
            crateID.push(newCrateId);
            await connection.query(insertCrateData, [
                newCrateId,
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

        let where = 'WHERE c.is_deleted = false';
        const params = [];

        if (customerName) {
            where += ` AND c.name LIKE ?`;
            params.push(`%${customerName}%`);
        }

        // Get total count based on customers
        const countQuery = `SELECT COUNT(*) AS total FROM Customers AS c ${where}`;
        const [[{ total }]] = await connection.query(countQuery, params);

        // Get paginated rows, starting from customers
                const dataQuery = `
                    SELECT 
                        c.customer_id, c.created_at, c.name, c.email, c.phone, c.city,
                        o.total_cost, o.weight_kg, o.status, o.crate_count, o.notes, o.order_id, o.boxes_count, o.pouches_count, o.actual_pouches
                    FROM Customers AS c
                    LEFT JOIN (
                        SELECT 
                            *,
                            ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY created_at DESC, order_id DESC) as rn
                        FROM Orders
                    ) AS o ON c.customer_id = o.customer_id AND o.rn = 1
                    ${where}
                    ORDER BY c.created_at DESC
                    LIMIT ? OFFSET ?
                `;        const [rows] = await connection.query(
            dataQuery,
            [...params, parsedLimit, offset]
        );

        connection.release();

        return {
            rows: rows,
            total,
        };
    } catch (error) {
        console.error('Error fetching customers:', error);
        connection.release();
        throw error;
    }
}

async function delete_customer(customer_id) {
    const connection = await pool.getConnection();
    try {
        const query = `
            UPDATE Customers
            SET is_deleted = true, deleted_at = NOW()
            WHERE customer_id = ?
        `;
        await connection.query(query, [customer_id]);
        connection.release();
        return true;
    } catch (error) {
        console.error('Error soft deleting customer:', error);
        connection.release();
        return false;
    }
}

async function get_deleted_customers() {
    const connection = await pool.getConnection();
    try {
        const query = `
            SELECT 
                c.customer_id, 
                c.name, 
                c.email, 
                c.phone, 
                c.city, 
                c.deleted_at,
                o.order_id,
                o.pouches_count,
                o.weight_kg,
                o.boxes_count,
                o.status as order_status,
                o.total_cost
            FROM Customers c
            LEFT JOIN Orders o ON c.customer_id = o.customer_id
            WHERE c.is_deleted = true
            ORDER BY c.deleted_at DESC, o.order_id DESC
        `;
        const [rows] = await connection.query(query);
        connection.release();
        
        // Group orders by customer
        const customersMap = new Map();
        rows.forEach(row => {
            if (!customersMap.has(row.customer_id)) {
                customersMap.set(row.customer_id, {
                    customer_id: row.customer_id,
                    name: row.name,
                    email: row.email,
                    phone: row.phone,
                    city: row.city,
                    deleted_at: row.deleted_at,
                    orders: []
                });
            }
            
            if (row.order_id) {
                customersMap.get(row.customer_id).orders.push({
                    order_id: row.order_id,
                    pouches_count: row.pouches_count,
                    weight_kg: row.weight_kg,
                    boxes_count: row.boxes_count,
                    status: row.order_status,
                    total_cost: row.total_cost
                });
            }
        });
        
        return Array.from(customersMap.values());
    } catch (error) {
        console.error('Error fetching deleted customers:', error);
        connection.release();
        return [];
    }
}

async function restore_customer(customer_id) {
    const connection = await pool.getConnection();
    try {
        const query = `
            UPDATE Customers
            SET is_deleted = false, deleted_at = NULL
            WHERE customer_id = ?
        `;
        await connection.query(query, [customer_id]);
        connection.release();
        return true;
    } catch (error) {
        console.error('Error restoring customer:', error);
        connection.release();
        return false;
    }
}


async function force_delete_customer(customer_id) {
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

        // --- Prepare Orders update (only affects the latest order) ---
        const orderFields = [];
        const orderValues = [];

        if (orderInfoChange.Date) {
            orderFields.push('created_at = ?');
            orderValues.push(logic.formatDateToSQL(orderInfoChange.Date));
        }
        if (orderInfoChange.weight) {
            orderFields.push('weight_kg = ?');
            orderValues.push(Number(parseFloat(orderInfoChange.weight).toFixed(2)));
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

        const [[latestOrder]] = await connection.query(
            'SELECT order_id FROM Orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1',
            [customer_id]
        );

        if (orderFields.length > 0) {
            if (!latestOrder) throw new Error("Customer has no orders to update.");
            orderValues.push(latestOrder.order_id);
            const orderQuery = `UPDATE Orders SET ${orderFields.join(', ')} WHERE order_id = ?`;
            await connection.query(orderQuery, orderValues);
        }

        // --- Handle crate updates intelligently ---
        if (orderInfoChange.crate) {
            if (!latestOrder) throw new Error("Cannot update crates for a customer with no orders.");
            const order_id = latestOrder.order_id;
            const newCrateCount = parseInt(orderInfoChange.crate, 10);

            const [existingCrates] = await connection.query("SELECT crate_id, status FROM Crates WHERE crate_id LIKE ?", [`CRATE_${order_id}_%`]);
            const existingCrateNumbers = existingCrates.map(c => ({
                num: parseInt(c.crate_id.split('_').pop(), 10),
                status: c.status
            })).sort((a, b) => a.num - b.num);

            const existingCount = existingCrates.length;

            if (newCrateCount > existingCount) {
                // INCREASE: Add missing crates
                const newCratesToInsert = [];
                const updatedAt = orderInfoChange.Date ? logic.formatDateToSQL(orderInfoChange.Date) : new Date();
                const existingNums = new Set(existingCrateNumbers.map(c => c.num));
                
                for (let i = 1; i <= newCrateCount; i++) {
                    if (!existingNums.has(i)) {
                        const newCrateId = `CRATE_${order_id}_${i}`;
                        newCratesToInsert.push([newCrateId, customer_id, 'Created', updatedAt, `${i}/${newCrateCount}`]);
                    }
                }
                if (newCratesToInsert.length > 0) {
                    await connection.query('INSERT INTO Crates (crate_id, customer_id, status, created_at, crate_order) VALUES ?', [newCratesToInsert]);
                }
            } else if (newCrateCount < existingCount) {
                // DECREASE: Remove extra crates after safety check
                const cratesToDelete = existingCrateNumbers.slice(newCrateCount);
                
                for (const crate of cratesToDelete) {
                    if (crate.status !== 'Created') {
                        throw new Error(`Cannot reduce crate count: Crate number ${crate.num} is already in use (status: ${crate.status}).`);
                    }
                }
                
                const idsToDelete = cratesToDelete.map(c => `CRATE_${order_id}_${c.num}`);
                if (idsToDelete.length > 0) {
                    const deletePlaceholders = idsToDelete.map(() => '?').join(',');
                    await connection.query(`DELETE FROM Crates WHERE crate_id IN (${deletePlaceholders})`, idsToDelete);
                }
            }
             // If newCrateCount equals existingCount, do nothing.
             // Also, update crate_order for all crates for this order.
             for(let i=1; i<=newCrateCount; i++){
                const crateId = `CRATE_${order_id}_${i}`;
                await connection.query(`UPDATE Crates SET crate_order = ? WHERE crate_id = ?`, [`${i}/${newCrateCount}`, crateId]);
             }
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
            o.customer_id,
            o.weight_kg,
            o.status,
            o.notes,
            o.boxes_count AS box_count,
            o.boxes_count,
            COALESCE(o.actual_pouches, o.pouches_count) AS pouches_count,
            o.created_at,
            c.name,
            c.phone,
            c.city,
            COALESCE(MAX(sp.shelf_name), MAX(sb.shelf_name)) AS shelf_name
        FROM Orders o
        JOIN Customers c ON o.customer_id = c.customer_id
        
        /* Link boxes that belong to this order */
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
        
        WHERE o.status = ?
          AND COALESCE(c.is_deleted, 0) = 0
        GROUP BY o.order_id, o.customer_id, o.weight_kg, o.status, o.notes, 
                 o.boxes_count, o.pouches_count, o.actual_pouches, o.created_at,
                 c.name, c.phone, c.city
        ORDER BY o.created_at ASC
    `, [status]);

    return rows;
}

async function getOrdersByStatusPaged(status, page = 1, limit = 20) {
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 20;
    const offset = (parsedPage - 1) * parsedLimit;

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM Orders WHERE status = ? AND COALESCE(is_deleted, 0) = 0`,
        [status]
    );

    const [rows] = await pool.query(`
        SELECT 
            o.order_id,
            o.customer_id,
            o.weight_kg,
            o.status,
            o.notes,
            o.boxes_count AS box_count,
            o.boxes_count,
            COALESCE(o.actual_pouches, o.pouches_count) AS pouches_count,
            o.created_at,
            c.name,
            c.phone,
            c.city,
            COALESCE(MAX(sp.shelf_name), MAX(sb.shelf_name)) AS shelf_name
        FROM Orders o
        JOIN Customers c ON o.customer_id = c.customer_id
        
        /* Link boxes that belong to this order */
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
        
        WHERE o.status = ?
          AND COALESCE(c.is_deleted, 0) = 0
        GROUP BY o.order_id, o.customer_id, o.weight_kg, o.status, o.notes, 
                 o.boxes_count, o.pouches_count, o.actual_pouches, o.created_at,
                 c.name, c.phone, c.city
        ORDER BY o.created_at ASC
        LIMIT ? OFFSET ?
    `, [status, parsedLimit, offset]);

    return { rows, total: Number(countRow?.total || 0) };
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

    // Lock order row and get boxes_count
    const [[o]] = await conn.query(
      `SELECT order_id, customer_id, weight_kg, boxes_count
         FROM Orders
        WHERE order_id = ?
        FOR UPDATE`,
      [order_id]
    );
    if (!o) throw new Error("Order not found");

    // Prioritize the stored boxes_count if it is a positive number.
    // Otherwise, fall back to calculating from weight.
    let boxCount = (o.boxes_count > 0) ? Number(o.boxes_count) : 0;
    if (boxCount === 0) {
      const weight = Number(o.weight_kg) || 0;
      const estimatedPouches = Math.floor((weight * 0.65) / 3);
      boxCount = Math.max(1, Math.ceil(estimatedPouches / 8));
    }

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

    console.log(`[markOrderAsDone] order=${order_id} intended=${boxCount} saved=${actualCount}`);

    return {
      created: rows.length,
      boxes_count: actualCount,
      estimatedPouches: null, // This value is not calculated here anymore unless as fallback
      boxCount: actualCount
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
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sets = [];
    const vals = [];

    if (data.name != null)            { sets.push('name = ?');          vals.push(String(data.name)); }
    if (data.status != null)          { sets.push('status = ?');        vals.push(String(data.status)); }
    if (data.weight_kg != null)       { sets.push('weight_kg = ?');     vals.push(Number(data.weight_kg) || 0); }

    if (data.actual_boxes != null)      { sets.push('boxes_count = ?');   vals.push(Number(data.actual_boxes) || 0); }
    else if (data.estimated_boxes != null) { sets.push('boxes_count = ?'); vals.push(Number(data.estimated_boxes) || 0); }
    
    if (data.estimated_pouches != null) { sets.push('pouches_count = ?'); vals.push(Number(data.estimated_pouches) || 0); }
    if (data.actual_pouches != null)    { sets.push('actual_pouches = ?'); vals.push(Number(data.actual_pouches) || 0); }

    if (sets.length > 0) {
      vals.push(order_id);
      await conn.query(
        `UPDATE Orders SET ${sets.join(', ')} WHERE order_id = ?`,
        vals
      );
    }

    const newBoxCount = data.actual_boxes != null ? Number(data.actual_boxes) : (data.estimated_boxes != null ? Number(data.estimated_boxes) : null);

    if (newBoxCount !== null && newBoxCount >= 0) {
        const [[order]] = await conn.query('SELECT customer_id FROM Orders WHERE order_id = ?', [order_id]);
        if (!order || !order.customer_id) {
            throw new Error('Order not found or customer_id is missing.');
        }
        const customer_id = order.customer_id;

        const [existingBoxes] = await conn.query("SELECT box_id FROM Boxes WHERE box_id LIKE ?", [`BOX_${order_id}_%`]);
        if (newBoxCount < existingBoxes.length) {
            const [placedBoxes] = await conn.query("SELECT COUNT(*) as count FROM Boxes WHERE box_id LIKE ? AND (pallet_id IS NOT NULL OR shelf_id IS NOT NULL)", [`BOX_${order_id}_%`]);
            if (placedBoxes[0].count > 0) {
                 throw new Error('Cannot reduce box count because one or more boxes for this order are already placed on a pallet or shelf.');
            }
        }
        
        await conn.query("DELETE FROM Boxes WHERE box_id LIKE ?", [`BOX_${order_id}_%`]);

        if (newBoxCount > 0) {
            const boxRows = [];
            const now = new Date();
            for (let i = 1; i <= newBoxCount; i++) {
                boxRows.push([`BOX_${order_id}_${i}`, customer_id, now]);
            }
            if (boxRows.length > 0) {
                await conn.query(
                    `INSERT INTO Boxes (box_id, customer_id, created_at) VALUES ?`,
                    [boxRows]
                );
            }
        }
    }

    await conn.commit();
    return { affectedRows: sets.length > 0 ? 1 : 0 };

  } catch (err) {
    await conn.rollback();
    console.error("Error in updateOrderInfo:", err);
    throw err;
  } finally {
    conn.release();
  }
}
      
      async function deleteOrder(order_id) {
        await pool.query(
          "UPDATE Orders SET is_deleted = 1, deleted_at = NOW() WHERE order_id = ?",
          [order_id]
        );
      }

      async function get_deleted_orders() {
        const [rows] = await pool.query(
          `
          SELECT
            o.order_id,
            o.status,
            o.weight_kg,
            o.boxes_count,
            o.pouches_count,
            o.actual_pouches,
            o.created_at,
            o.deleted_at,
            c.name,
            c.city
          FROM Orders o
          JOIN Customers c ON o.customer_id = c.customer_id
          WHERE COALESCE(o.is_deleted, 0) = 1
          ORDER BY o.deleted_at DESC
          `
        );
        return rows;
      }

      async function restore_order(order_id) {
        await pool.query(
          "UPDATE Orders SET is_deleted = 0, deleted_at = NULL WHERE order_id = ?",
          [order_id]
        );
      }

      async function force_delete_order(order_id) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          const pattern = `BOX_${order_id}%`;
          await connection.query("DELETE FROM Boxes WHERE box_id LIKE ?", [pattern]);
          await connection.query("DELETE FROM Orders WHERE order_id = ?", [order_id]);
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      }
      
      async function getPalletsByLocation(location) {
        const [rows] = await pool.query(
          `SELECT * FROM Pallets WHERE location = ? ORDER BY created_at DESC`,
          [location]
        );
        return rows;
      }
      
      async function createPallet(location, capacity, palletName = null) {
        const connection = await pool.getConnection();
        try {
          // Auto-number within the same location if no name given
          const [[{ cnt }]] = await connection.query(
            'SELECT COUNT(*) AS cnt FROM Pallets WHERE location = ?',
            [location]
          );
          const pallet_name = palletName && palletName.trim()
            ? palletName.trim()
            : `${location} - Pallet ${cnt + 1}`;

          const pallet_id = generateUUID();
          await connection.query(
            `INSERT INTO Pallets (pallet_id, location, status, capacity, holding, pallet_name, created_at)
             VALUES (?, ?, 'available', ?, 0, ?, NOW())`,
            [pallet_id, location, capacity, pallet_name]
          );
          return { pallet_id, pallet_name };
        } finally {
          connection.release();
        }
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
          WHERE (c.name LIKE ? OR c.phone LIKE ?)
            AND COALESCE(o.is_deleted, 0) = 0
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
      o.pouches_count,

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

    WHERE (c.name  LIKE ? OR c.phone LIKE ?)
      AND COALESCE(o.is_deleted, 0) = 0

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
  const [rows] = await pool.query(
    `SELECT 
      s.*,
      COUNT(DISTINCT b.box_id) AS holding
    FROM Shelves s
    LEFT JOIN Boxes b ON (b.shelf_id = s.shelf_id OR b.pallet_id IN (
      SELECT pallet_id FROM Pallets WHERE shelf_id = s.shelf_id
    ))
    WHERE s.location = ?
    GROUP BY s.shelf_id`,
    [location]
  );
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
  const [[{ daily_kgs_today }]] = await pool.query(
    `
    SELECT COALESCE(SUM(o.weight_kg), 0) AS daily_kgs_today
    FROM (
      SELECT DISTINCT SUBSTRING(b.box_id, 5, 36) AS order_id
      FROM Boxes b
      WHERE DATE(b.created_at) = CURDATE()
        AND b.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}(_|$)'
    ) x
    JOIN Orders o ON o.order_id = x.order_id
    `
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
  const [[{ daily_kgs_yesterday }]] = await pool.query(
    `
    SELECT COALESCE(SUM(o.weight_kg), 0) AS daily_kgs_yesterday
    FROM (
      SELECT DISTINCT SUBSTRING(b.box_id, 5, 36) AS order_id
      FROM Boxes b
      WHERE DATE(b.created_at) = (CURDATE() - INTERVAL 1 DAY)
        AND b.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}(_|$)'
    ) x
    JOIN Orders o ON o.order_id = x.order_id
    `
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
  const daily_production_kgs   = Number(Number(daily_kgs_today || 0).toFixed(2));
  const daily_production_kgs_y = Number(Number(daily_kgs_yesterday || 0).toFixed(2));
  const eff_today = crates_today    ? (Number(boxes_today || 0) / Number(crates_today)) * 100 : 0;
  const eff_yday  = crates_yesterday? (Number(boxes_yesterday || 0) / Number(crates_yesterday)) * 100 : 0;

  const changes = {
    daily_production_pct:      pctChange(daily_production_kgs, daily_production_kgs_y),
    active_orders_pct:         pctChange(Number(orders_new_today || 0), Number(orders_new_yesterday || 0)),
    customers_served_pct:      pctChange(Number(customers_today || 0), Number(customers_yesterday || 0)),
    processing_efficiency_pct: Number((eff_today - eff_yday).toFixed(1)),
  };

  return {
    daily_production_kgs,
    active_orders: Number(active_orders || 0),
    customers_served: Number(customers_served || 0),
    processing_efficiency: Number(eff_today.toFixed(1)),
    overview: {
      juice_kgs: daily_production_kgs,
      crates_processed: Number(crates_today || 0),
      orders_fulfilled: Number(orders_fulfilled_today || 0), // ← tweaked
    },
    changes,
  };
}


// ----- Recent activity for dashboard/notifications -----
async function getRecentActivity(limit = 20) {
  limit = Math.max(1, Math.min(10000, Number(limit || 20)));
  const [rows] = await pool.query(
    `
    SELECT * FROM (
      -- new customer created
      SELECT c.created_at AS ts,
             CONCAT('New customer registered - ', c.name) AS message,
             'customer' AS type
        FROM Customers c
       WHERE c.is_deleted = 0

      UNION ALL
      -- customer deleted to bin
      SELECT c.deleted_at AS ts,
             CONCAT('Customer deleted to bin - ', c.name) AS message,
             'customer' AS type
        FROM Customers c
       WHERE c.is_deleted = 1 AND c.deleted_at IS NOT NULL

      UNION ALL
      -- processing completed (boxes created)
      SELECT b.created_at AS ts,
             CONCAT('Juice processing completed - ', cu.name) AS message,
             'processing' AS type
        FROM Boxes b
        LEFT JOIN Customers cu ON b.customer_id = cu.customer_id

      UNION ALL
      -- order picked up (based on ready_at timestamp when status changed to Picked up)
      SELECT o.ready_at AS ts,
             CONCAT('Order picked up - ', c.name) AS message,
             'customer' AS type
        FROM Orders o
        LEFT JOIN Customers c ON o.customer_id = c.customer_id
       WHERE o.status = 'Picked up' AND o.ready_at IS NOT NULL

      UNION ALL
      -- pallet created
      SELECT p.created_at AS ts,
             CONCAT('Pallet created - ', p.pallet_id) AS message,
             'warehouse' AS type
        FROM Pallets p

      UNION ALL
      -- shelf created
      SELECT s.created_at AS ts,
             CONCAT('Shelf created - ', s.shelf_name, ' (', IFNULL(s.location,''), ')') AS message,
             'warehouse' AS type
        FROM Shelves s
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
    SELECT DISTINCT c.customer_id, c.name, c.phone, c.city
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

async function deleteCity(cityName) {
    try {
        await pool.query('DELETE FROM Cities WHERE name = ?', [cityName]);
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

// --- Daily totals: kilograms + pouches per production day ------------------
async function getDailyTotals(days = 30) {
  const n = Math.max(1, Math.min(365, Number(days) || 30));

  const [rows] = await pool.query(
    `
    SELECT
      DATE(
        IF(HOUR(b.created_at) < 6,
           DATE_SUB(DATE(b.created_at), INTERVAL 1 DAY),
           DATE(b.created_at)
        )
      ) AS d,
      COALESCE(SUM(COALESCE(o.actual_pouches, o.pouches_count)), 0) AS total_pouches,
      COALESCE(SUM(o.weight_kg), 0)     AS total_kgs
    FROM (
      SELECT
        SUBSTRING(bx.box_id, 5, 36) AS order_id,
        MIN(bx.created_at) AS created_at
      FROM Boxes bx
      WHERE bx.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND bx.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}(_|$)'
      GROUP BY order_id
    ) b
    JOIN Orders o ON o.order_id = b.order_id
    GROUP BY d
    ORDER BY d DESC
    `,
    [n]
  );

  const toDateStr = (x) => (x instanceof Date ? x.toISOString().slice(0, 10) : String(x));

  return rows.map(r => ({
    date: toDateStr(r.d),
    total_kgs: Number(Number(r.total_kgs || 0).toFixed(2)),
    total_pouches: Number(r.total_pouches || 0),
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

// Helper: Calculate start and end of a "production day" (6am to 6am next day)
function getProductionDayBoundaries(date = null) {
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0); // start of calendar day
  
  // If current time is before 6am, it belongs to yesterday's production day
  const now = new Date();
  const hour = now.getHours();
  
  if (date) {
    // For a specific date, determine if we're in the morning (before 6am) or not
    const checkTime = new Date(date);
    checkTime.setHours(6, 0, 0, 0); // 6am boundary
    
    if (date < checkTime) {
      // Before 6am = belongs to previous day's production
      const dayStart = new Date(date);
      dayStart.setDate(dayStart.getDate() - 1);
      dayStart.setHours(6, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      dayEnd.setHours(6, 0, 0, 0);
      
      return { start: dayStart, end: dayEnd };
    } else {
      // 6am or after = today's production
      const dayStart = new Date(date);
      dayStart.setHours(6, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      dayEnd.setHours(6, 0, 0, 0);
      
      return { start: dayStart, end: dayEnd };
    }
  }
  
  // For current time
  const baseDate = new Date(d);
  if (hour < 6) {
    // Before 6am = still in yesterday's production day
    baseDate.setDate(baseDate.getDate() - 1);
  }
  
  const dayStart = new Date(baseDate);
  dayStart.setHours(6, 0, 0, 0);
  
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  dayEnd.setHours(6, 0, 0, 0);
  
  return { start: dayStart, end: dayEnd };
}

// Get today's production metrics (6am to 6am logic)
async function getTodayMetrics() {
  const { start, end } = getProductionDayBoundaries();
  
  try {
    const [pouchesResult] = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(actual_pouches, pouches_count)), 0) AS pouches_made FROM Orders 
       WHERE created_at >= ? AND created_at < ?`,
      [start, end]
    );
    const pouches_made = pouchesResult[0]?.pouches_made || 0;
    
    const [processedResult] = await pool.query(
      `SELECT COALESCE(SUM(weight_kg), 0) AS kg_processed FROM Orders 
       WHERE status IN ('Ready for pickup', 'Picked up') 
       AND created_at >= ? AND created_at < ?`,
      [start, end]
    );
    const kg_processed = processedResult[0]?.kg_processed || 0;
    
    const [takenResult] = await pool.query(
      `SELECT COALESCE(SUM(weight_kg), 0) AS kg_taken_in FROM Orders 
       WHERE status IS NOT NULL 
       AND created_at >= ? AND created_at < ?`,
      [start, end]
    );
    const kg_taken_in = takenResult[0]?.kg_taken_in || 0;
    
    return {
      pouches_made: Number(pouches_made || 0),
      kg_processed: Number(Number(kg_processed || 0).toFixed(2)),
      kg_taken_in: Number(Number(kg_taken_in || 0).toFixed(2)),
    };
  } catch (err) {
    console.error('getTodayMetrics error:', err);
    return {
      pouches_made: 0,
      kg_processed: 0,
      kg_taken_in: 0,
    };
  }
}

// Get yesterday's production metrics for comparison
async function getYesterdayMetrics() {
  const { start } = getProductionDayBoundaries();
  const yesterday = new Date(start);
  yesterday.setDate(yesterday.getDate() - 1);
  const { start: yStart, end: yEnd } = getProductionDayBoundaries(yesterday);
  
  try {
    const [pouchesResult] = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(actual_pouches, pouches_count)), 0) AS pouches_made FROM Orders 
       WHERE created_at >= ? AND created_at < ?`,
      [yStart, yEnd]
    );
    const pouches_made = pouchesResult[0]?.pouches_made || 0;
    
    const [processedResult] = await pool.query(
      `SELECT COALESCE(SUM(weight_kg), 0) AS kg_processed FROM Orders 
       WHERE status IN ('Ready for pickup', 'Picked up') 
       AND created_at >= ? AND created_at < ?`,
      [yStart, yEnd]
    );
    const kg_processed = processedResult[0]?.kg_processed || 0;
    
    const [takenResult] = await pool.query(
      `SELECT COALESCE(SUM(weight_kg), 0) AS kg_taken_in FROM Orders 
       WHERE status IS NOT NULL 
       AND created_at >= ? AND created_at < ?`,
      [yStart, yEnd]
    );
    const kg_taken_in = takenResult[0]?.kg_taken_in || 0;
    
    return {
      pouches_made: Number(pouches_made || 0),
      kg_processed: Number(Number(kg_processed || 0).toFixed(2)),
      kg_taken_in: Number(Number(kg_taken_in || 0).toFixed(2)),
    };
  } catch (err) {
    console.error('getYesterdayMetrics error:', err);
    return {
      pouches_made: 0,
      kg_processed: 0,
      kg_taken_in: 0,
    };
  }
}

// Get historical metrics for charting (daily, weekly, monthly, yearly)
async function getHistoricalMetrics(period = 'daily', days = 30) {
  // period: 'daily', 'weekly', 'monthly', 'yearly'
  let format;
  
  switch(period) {
    case 'weekly':
      format = '%Y-W%u'; // Year-Week
      break;
    case 'monthly':
      format = '%Y-%m';
      break;
    case 'yearly':
      format = '%Y';
      break;
    default:
      format = '%Y-%m-%d';
  }
  
  try {
    // Adjusted for 6am boundaries: group by production day (6am to 6am)
    const [rows] = await pool.query(
      `SELECT
        DATE_FORMAT(
          IF(HOUR(o.created_at) < 6,
             DATE_SUB(DATE(o.created_at), INTERVAL 1 DAY),
             DATE(o.created_at)
          ),
          ?
        ) AS period,
        COALESCE(SUM(COALESCE(o.actual_pouches, o.pouches_count)), 0) AS pouches_made,
        COALESCE(SUM(CASE WHEN o.status IN ('Ready for pickup', 'Picked up') THEN o.weight_kg ELSE 0 END), 0) AS kg_processed,
        COALESCE(SUM(CASE WHEN o.status IS NOT NULL THEN o.weight_kg ELSE 0 END), 0) AS kg_taken_in
      FROM Orders o
      WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY period
      ORDER BY period DESC`,
      [format, days]
    );
    
    return rows.map(r => ({
      period: r.period || 'N/A',
      pouches_made: Number(r.pouches_made || 0),
      kg_processed: Number(Number(r.kg_processed || 0).toFixed(2)),
      kg_taken_in: Number(Number(r.kg_taken_in || 0).toFixed(2)),
    }));
  } catch (err) {
    console.error('getHistoricalMetrics error:', err);
    return [];
  }
}

// Admin reports: order-level rows for production + financial reporting
async function getAdminReportRows({ startDate, endDate, cities = [] } = {}) {
  const params = [];
  const filters = [];

  if (startDate) {
    filters.push("DATE(b.created_at) >= ?");
    params.push(startDate);
  }
  if (endDate) {
    filters.push("DATE(b.created_at) <= ?");
    params.push(endDate);
  }
  if (Array.isArray(cities) && cities.length > 0) {
    const placeholders = cities.map(() => "?").join(",");
    filters.push(`c.city IN (${placeholders})`);
    params.push(...cities);
  }

  const whereSql = filters.length ? `AND ${filters.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `
    SELECT
      DATE(b.created_at) AS production_date,
      c.city,
      c.name AS customer_name,
      o.order_id,
      COALESCE(o.actual_pouches, o.pouches_count, 0) AS pouches_produced,
      COALESCE(o.weight_kg, 0) AS kilos,
      COALESCE(o.total_cost, 0) AS total_cost
    FROM (
      SELECT
        SUBSTRING(bx.box_id, 5, 36) AS order_id,
        MIN(bx.created_at) AS created_at
      FROM Boxes bx
      WHERE bx.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}(_|$)'
      GROUP BY order_id
    ) b
    JOIN Orders o ON o.order_id = b.order_id
    JOIN Customers c ON c.customer_id = o.customer_id
    WHERE 1=1
      AND COALESCE(o.is_deleted, 0) = 0
      ${whereSql}
    ORDER BY b.created_at DESC, o.order_id ASC
    `,
    params
  );

  const toDateStr = (x) => (x instanceof Date ? x.toISOString().slice(0, 10) : String(x || ""));

  return rows.map((r) => ({
    production_date: toDateStr(r.production_date),
    city: r.city || "Unknown",
    customer_name: r.customer_name || "",
    order_id: r.order_id,
    pouches_produced: Number(r.pouches_produced || 0),
    kilos: Number(Number(r.kilos || 0).toFixed(2)),
    total_cost: Number(Number(r.total_cost || 0).toFixed(2)),
  }));
}

async function getCostCenters() {
  const [rows] = await pool.query(
    `
    SELECT center_id, name, category, created_at, updated_at
    FROM CostCenters
    ORDER BY name ASC
    `
  );
  return rows.map((row) => ({
    center_id: row.center_id,
    name: row.name,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

async function createCostCenter({ name, category }) {
  const [result] = await pool.query(
    "INSERT INTO CostCenters (name, category) VALUES (?, ?)",
    [name, category]
  );
  const [rows] = await pool.query(
    "SELECT center_id, name, category, created_at, updated_at FROM CostCenters WHERE center_id = ?",
    [result.insertId]
  );
  return rows[0] || null;
}

async function updateCostCenter(centerId, { name, category }) {
  const fields = [];
  const values = [];
  if (name != null) {
    fields.push("name = ?");
    values.push(name);
  }
  if (category != null) {
    fields.push("category = ?");
    values.push(category);
  }
  if (!fields.length) return null;

  values.push(centerId);
  await pool.query(
    `UPDATE CostCenters SET ${fields.join(", ")} WHERE center_id = ?`,
    values
  );
  const [rows] = await pool.query(
    "SELECT center_id, name, category, created_at, updated_at FROM CostCenters WHERE center_id = ?",
    [centerId]
  );
  return rows[0] || null;
}

async function deleteCostCenter(centerId) {
  await pool.query("DELETE FROM CostCenters WHERE center_id = ?", [centerId]);
}

async function getCostEntries({ startDate, endDate } = {}) {
  const params = [];
  const filters = [];
  if (startDate) {
    filters.push("ce.incurred_date >= ?");
    params.push(startDate);
  }
  if (endDate) {
    filters.push("ce.incurred_date <= ?");
    params.push(endDate);
  }
  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `
    SELECT
      ce.entry_id,
      ce.center_id,
      ce.amount,
      ce.incurred_date,
      ce.notes,
      cc.name AS center_name,
      cc.category AS center_category
    FROM CostEntries ce
    JOIN CostCenters cc ON cc.center_id = ce.center_id
    ${whereSql}
    ORDER BY ce.incurred_date DESC, ce.entry_id DESC
    `,
    params
  );
  const toDateStr = (x) => (x instanceof Date ? x.toISOString().slice(0, 10) : String(x || ""));
  return rows.map((row) => ({
    entry_id: row.entry_id,
    center_id: row.center_id,
    center_name: row.center_name,
    center_category: row.center_category,
    amount: Number(Number(row.amount || 0).toFixed(2)),
    incurred_date: toDateStr(row.incurred_date),
    notes: row.notes || "",
  }));
}

async function createCostEntry({ centerId, amount, incurredDate, notes }) {
  const [result] = await pool.query(
    "INSERT INTO CostEntries (center_id, amount, incurred_date, notes) VALUES (?, ?, ?, ?)",
    [centerId, amount, incurredDate, notes || null]
  );
  const [rows] = await pool.query(
    `
    SELECT
      ce.entry_id,
      ce.center_id,
      ce.amount,
      ce.incurred_date,
      ce.notes,
      cc.name AS center_name,
      cc.category AS center_category
    FROM CostEntries ce
    JOIN CostCenters cc ON cc.center_id = ce.center_id
    WHERE ce.entry_id = ?
    `,
    [result.insertId]
  );
  return rows[0] || null;
}

async function updateCostEntry(entryId, { centerId, amount, incurredDate, notes }) {
  await pool.query(
    "UPDATE CostEntries SET center_id = ?, amount = ?, incurred_date = ?, notes = ? WHERE entry_id = ?",
    [centerId, amount, incurredDate, notes || null, entryId]
  );
  const [rows] = await pool.query(
    `
    SELECT
      ce.entry_id,
      ce.center_id,
      ce.amount,
      ce.incurred_date,
      ce.notes,
      cc.name AS center_name,
      cc.category AS center_category
    FROM CostEntries ce
    JOIN CostCenters cc ON cc.center_id = ce.center_id
    WHERE ce.entry_id = ?
    `,
    [entryId]
  );
  return rows[0] || null;
}

async function deleteCostEntry(entryId) {
  await pool.query("DELETE FROM CostEntries WHERE entry_id = ?", [entryId]);
}

async function getInventoryItems() {
  const [rows] = await pool.query(
    `
    SELECT item_id, name, sku, unit, category, cost_center_id, created_at, updated_at
    FROM InventoryItems
    ORDER BY name ASC
    `
  );
  return rows;
}

async function createInventoryItem({ name, sku, unit, category, costCenterId }) {
  const [result] = await pool.query(
    `
    INSERT INTO InventoryItems (name, sku, unit, category, cost_center_id)
    VALUES (?, ?, ?, ?, ?)
    `,
    [name, sku || null, unit || "unit", category || null, costCenterId || null]
  );
  const [rows] = await pool.query(
    `
    SELECT item_id, name, sku, unit, category, cost_center_id, created_at, updated_at
    FROM InventoryItems
    WHERE item_id = ?
    `,
    [result.insertId]
  );
  return rows[0] || null;
}

async function updateInventoryItem(itemId, { name, sku, unit, category, costCenterId }) {
  const fields = [];
  const values = [];
  if (name != null) {
    fields.push("name = ?");
    values.push(name);
  }
  if (sku !== undefined) {
    fields.push("sku = ?");
    values.push(sku || null);
  }
  if (unit != null) {
    fields.push("unit = ?");
    values.push(unit);
  }
  if (category !== undefined) {
    fields.push("category = ?");
    values.push(category || null);
  }
  if (costCenterId !== undefined) {
    fields.push("cost_center_id = ?");
    values.push(costCenterId || null);
  }
  if (!fields.length) return null;

  values.push(itemId);
  await pool.query(
    `UPDATE InventoryItems SET ${fields.join(", ")} WHERE item_id = ?`,
    values
  );
  const [rows] = await pool.query(
    `
    SELECT item_id, name, sku, unit, category, cost_center_id, created_at, updated_at
    FROM InventoryItems
    WHERE item_id = ?
    `,
    [itemId]
  );
  return rows[0] || null;
}

async function deleteInventoryItem(itemId) {
  const [[{ cnt }]] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM InventoryTransactions WHERE item_id = ?",
    [itemId]
  );
  if (Number(cnt || 0) > 0) {
    return false;
  }
  await pool.query("DELETE FROM InventoryItems WHERE item_id = ?", [itemId]);
  return true;
}

async function getInventoryTransactions({ startDate, endDate, itemId } = {}) {
  const params = [];
  const filters = [];
  if (startDate) {
    filters.push("t.tx_date >= ?");
    params.push(startDate);
  }
  if (endDate) {
    filters.push("t.tx_date <= ?");
    params.push(endDate);
  }
  if (itemId) {
    filters.push("t.item_id = ?");
    params.push(itemId);
  }
  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `
    SELECT
      t.tx_id,
      t.item_id,
      i.name AS item_name,
      i.unit,
      i.category,
      i.cost_center_id,
      t.tx_type,
      t.quantity,
      t.unit_cost,
      t.total_cost,
      t.cost_entry_id,
      t.tx_date,
      t.notes,
      t.created_at,
      t.updated_at
    FROM InventoryTransactions t
    JOIN InventoryItems i ON i.item_id = t.item_id
    ${whereSql}
    ORDER BY t.tx_date DESC, t.tx_id DESC
    `,
    params
  );
  const toDateStr = (x) => (x instanceof Date ? x.toISOString().slice(0, 10) : String(x || ""));
  return rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity || 0),
    unit_cost: row.unit_cost != null ? Number(row.unit_cost) : null,
    total_cost: row.total_cost != null ? Number(row.total_cost) : null,
    tx_date: toDateStr(row.tx_date),
  }));
}

async function createInventoryTransaction({ itemId, txType, quantity, unitCost, txDate, notes, syncCost = true }) {
  const [[item]] = await pool.query(
    "SELECT item_id, name, cost_center_id FROM InventoryItems WHERE item_id = ?",
    [itemId]
  );
  if (!item) throw new Error("Inventory item not found");

  const qty = Number(quantity);
  const unitCostNum = unitCost != null && unitCost !== "" ? Number(unitCost) : null;
  const totalCost = unitCostNum != null ? Number((qty * unitCostNum).toFixed(2)) : null;

  const [result] = await pool.query(
    `
    INSERT INTO InventoryTransactions (item_id, tx_type, quantity, unit_cost, total_cost, tx_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [itemId, txType, qty, unitCostNum, totalCost, txDate, notes || null]
  );

  let costEntryId = null;
  const shouldSync = syncCost && totalCost != null && totalCost > 0 && item.cost_center_id && (txType === "purchase" || txType === "adjustment");
  if (shouldSync) {
    const [costEntryResult] = await pool.query(
      "INSERT INTO CostEntries (center_id, amount, incurred_date, notes) VALUES (?, ?, ?, ?)",
      [
        item.cost_center_id,
        totalCost,
        txDate,
        notes ? `Inventory: ${item.name} (${txType}) - ${notes}` : `Inventory: ${item.name} (${txType})`,
      ]
    );
    costEntryId = costEntryResult.insertId;
    await pool.query(
      "UPDATE InventoryTransactions SET cost_entry_id = ? WHERE tx_id = ?",
      [costEntryId, result.insertId]
    );
  }

  const [rows] = await pool.query(
    `
    SELECT
      t.tx_id,
      t.item_id,
      i.name AS item_name,
      i.unit,
      i.category,
      i.cost_center_id,
      t.tx_type,
      t.quantity,
      t.unit_cost,
      t.total_cost,
      t.cost_entry_id,
      t.tx_date,
      t.notes,
      t.created_at,
      t.updated_at
    FROM InventoryTransactions t
    JOIN InventoryItems i ON i.item_id = t.item_id
    WHERE t.tx_id = ?
    `,
    [result.insertId]
  );
  return rows[0] || null;
}

async function updateInventoryTransaction(txId, { itemId, txType, quantity, unitCost, txDate, notes, syncCost = true }) {
  const [[existing]] = await pool.query(
    "SELECT cost_entry_id FROM InventoryTransactions WHERE tx_id = ?",
    [txId]
  );
  if (!existing) throw new Error("Inventory transaction not found");

  const [[item]] = await pool.query(
    "SELECT item_id, name, cost_center_id FROM InventoryItems WHERE item_id = ?",
    [itemId]
  );
  if (!item) throw new Error("Inventory item not found");

  const qty = Number(quantity);
  const unitCostNum = unitCost != null && unitCost !== "" ? Number(unitCost) : null;
  const totalCost = unitCostNum != null ? Number((qty * unitCostNum).toFixed(2)) : null;

  await pool.query(
    `
    UPDATE InventoryTransactions
    SET item_id = ?, tx_type = ?, quantity = ?, unit_cost = ?, total_cost = ?, tx_date = ?, notes = ?
    WHERE tx_id = ?
    `,
    [itemId, txType, qty, unitCostNum, totalCost, txDate, notes || null, txId]
  );

  const shouldSync = syncCost && totalCost != null && totalCost > 0 && item.cost_center_id && (txType === "purchase" || txType === "adjustment");
  if (existing.cost_entry_id && !shouldSync) {
    await pool.query("DELETE FROM CostEntries WHERE entry_id = ?", [existing.cost_entry_id]);
    await pool.query("UPDATE InventoryTransactions SET cost_entry_id = NULL WHERE tx_id = ?", [txId]);
  } else if (existing.cost_entry_id && shouldSync) {
    await pool.query(
      "UPDATE CostEntries SET center_id = ?, amount = ?, incurred_date = ?, notes = ? WHERE entry_id = ?",
      [
        item.cost_center_id,
        totalCost,
        txDate,
        notes ? `Inventory: ${item.name} (${txType}) - ${notes}` : `Inventory: ${item.name} (${txType})`,
        existing.cost_entry_id,
      ]
    );
  } else if (!existing.cost_entry_id && shouldSync) {
    const [costEntryResult] = await pool.query(
      "INSERT INTO CostEntries (center_id, amount, incurred_date, notes) VALUES (?, ?, ?, ?)",
      [
        item.cost_center_id,
        totalCost,
        txDate,
        notes ? `Inventory: ${item.name} (${txType}) - ${notes}` : `Inventory: ${item.name} (${txType})`,
      ]
    );
    await pool.query(
      "UPDATE InventoryTransactions SET cost_entry_id = ? WHERE tx_id = ?",
      [costEntryResult.insertId, txId]
    );
  }

  const [rows] = await pool.query(
    `
    SELECT
      t.tx_id,
      t.item_id,
      i.name AS item_name,
      i.unit,
      i.category,
      i.cost_center_id,
      t.tx_type,
      t.quantity,
      t.unit_cost,
      t.total_cost,
      t.cost_entry_id,
      t.tx_date,
      t.notes,
      t.created_at,
      t.updated_at
    FROM InventoryTransactions t
    JOIN InventoryItems i ON i.item_id = t.item_id
    WHERE t.tx_id = ?
    `,
    [txId]
  );
  return rows[0] || null;
}

async function deleteInventoryTransaction(txId) {
  const [[existing]] = await pool.query(
    "SELECT cost_entry_id FROM InventoryTransactions WHERE tx_id = ?",
    [txId]
  );
  if (!existing) return;
  if (existing.cost_entry_id) {
    await pool.query("DELETE FROM CostEntries WHERE entry_id = ?", [existing.cost_entry_id]);
  }
  await pool.query("DELETE FROM InventoryTransactions WHERE tx_id = ?", [txId]);
}

async function getInventorySummary({ asOfDate } = {}) {
  const [items] = await pool.query(
    `
    SELECT item_id, name, unit, category
    FROM InventoryItems
    ORDER BY name ASC
    `
  );

  const params = [];
  let whereSql = "";
  if (asOfDate) {
    whereSql = "WHERE tx_date <= ?";
    params.push(asOfDate);
  }

  const [txs] = await pool.query(
    `
    SELECT tx_id, item_id, tx_type, quantity, unit_cost, tx_date
    FROM InventoryTransactions
    ${whereSql}
    ORDER BY tx_date ASC, tx_id ASC
    `,
    params
  );

  const map = new Map();
  items.forEach((item) => {
    map.set(item.item_id, {
      ...item,
      on_hand: 0,
      last_unit_cost: null,
      inventory_value: 0,
    });
  });

  txs.forEach((tx) => {
    const entry = map.get(tx.item_id);
    if (!entry) return;
    const qty = Number(tx.quantity || 0);
    if (tx.tx_type === "usage") {
      entry.on_hand -= qty;
    } else {
      entry.on_hand += qty;
    }
    if (tx.unit_cost != null) {
      entry.last_unit_cost = Number(tx.unit_cost);
    }
  });

  map.forEach((entry) => {
    const cost = Number(entry.last_unit_cost || 0);
    entry.inventory_value = Number((entry.on_hand * cost).toFixed(2));
    entry.on_hand = Number(Number(entry.on_hand || 0).toFixed(2));
  });

  return Array.from(map.values());
}

async function getAssets({ asOfDate } = {}) {
  const params = [];
  let whereSql = "";
  if (asOfDate) {
    whereSql = "WHERE acquired_date <= ?";
    params.push(asOfDate);
  }
  const [rows] = await pool.query(
    `
    SELECT asset_id, name, category, value, acquired_date, notes, created_at, updated_at
    FROM FixedAssets
    ${whereSql}
    ORDER BY acquired_date DESC, asset_id DESC
    `,
    params
  );
  const toDateStr = (x) => (x instanceof Date ? x.toISOString().slice(0, 10) : String(x || ""));
  return rows.map((row) => ({
    ...row,
    value: Number(row.value || 0),
    acquired_date: toDateStr(row.acquired_date),
  }));
}

async function createAsset({ name, category, value, acquiredDate, notes }) {
  const [result] = await pool.query(
    `
    INSERT INTO FixedAssets (name, category, value, acquired_date, notes)
    VALUES (?, ?, ?, ?, ?)
    `,
    [name, category || null, value, acquiredDate, notes || null]
  );
  const [rows] = await pool.query(
    `
    SELECT asset_id, name, category, value, acquired_date, notes, created_at, updated_at
    FROM FixedAssets
    WHERE asset_id = ?
    `,
    [result.insertId]
  );
  return rows[0] || null;
}

async function updateAsset(assetId, { name, category, value, acquiredDate, notes }) {
  await pool.query(
    `
    UPDATE FixedAssets
    SET name = ?, category = ?, value = ?, acquired_date = ?, notes = ?
    WHERE asset_id = ?
    `,
    [name, category || null, value, acquiredDate, notes || null, assetId]
  );
  const [rows] = await pool.query(
    `
    SELECT asset_id, name, category, value, acquired_date, notes, created_at, updated_at
    FROM FixedAssets
    WHERE asset_id = ?
    `,
    [assetId]
  );
  return rows[0] || null;
}

async function deleteAsset(assetId) {
  await pool.query("DELETE FROM FixedAssets WHERE asset_id = ?", [assetId]);
}

async function getLiabilities({ asOfDate } = {}) {
  const params = [];
  let whereSql = "";
  if (asOfDate) {
    whereSql = "WHERE as_of_date <= ?";
    params.push(asOfDate);
  }
  const [rows] = await pool.query(
    `
    SELECT liability_id, name, category, value, as_of_date, notes, created_at, updated_at
    FROM Liabilities
    ${whereSql}
    ORDER BY as_of_date DESC, liability_id DESC
    `,
    params
  );
  const toDateStr = (x) => (x instanceof Date ? x.toISOString().slice(0, 10) : String(x || ""));
  return rows.map((row) => ({
    ...row,
    value: Number(row.value || 0),
    as_of_date: toDateStr(row.as_of_date),
  }));
}

async function createLiability({ name, category, value, asOfDate, notes }) {
  const [result] = await pool.query(
    `
    INSERT INTO Liabilities (name, category, value, as_of_date, notes)
    VALUES (?, ?, ?, ?, ?)
    `,
    [name, category || null, value, asOfDate, notes || null]
  );
  const [rows] = await pool.query(
    `
    SELECT liability_id, name, category, value, as_of_date, notes, created_at, updated_at
    FROM Liabilities
    WHERE liability_id = ?
    `,
    [result.insertId]
  );
  return rows[0] || null;
}

async function updateLiability(liabilityId, { name, category, value, asOfDate, notes }) {
  await pool.query(
    `
    UPDATE Liabilities
    SET name = ?, category = ?, value = ?, as_of_date = ?, notes = ?
    WHERE liability_id = ?
    `,
    [name, category || null, value, asOfDate, notes || null, liabilityId]
  );
  const [rows] = await pool.query(
    `
    SELECT liability_id, name, category, value, as_of_date, notes, created_at, updated_at
    FROM Liabilities
    WHERE liability_id = ?
    `,
    [liabilityId]
  );
  return rows[0] || null;
}

async function deleteLiability(liabilityId) {
  await pool.query("DELETE FROM Liabilities WHERE liability_id = ?", [liabilityId]);
}

module.exports = {
    updateAdminPassword,
    addCities,
    getAllCities,
    deleteCity,
    checkPassword,
    update_new_customer_data, 
    get_crate_data, 
    update_crates_status, 
    update_order_status, 
    getCustomers,
    delete_customer,
    force_delete_customer,
    get_deleted_customers,
    restore_customer,
    updateCustomerData,
    get_crates_by_customer,
    getOrdersByStatus,
    getOrdersByStatusPaged,
    markOrderAsDone,
    updateOrderInfo,
    deleteOrder,
    get_deleted_orders,
    restore_order,
    force_delete_order,
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
    getTodayMetrics,
    getYesterdayMetrics,
    getHistoricalMetrics,
    getProductionDayBoundaries,
    getAdminReportRows,
    pctChange,
    getCostCenters,
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,
    getCostEntries,
    createCostEntry,
    updateCostEntry,
    deleteCostEntry,
    getInventoryItems,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getInventoryTransactions,
    createInventoryTransaction,
    updateInventoryTransaction,
    deleteInventoryTransaction,
    getInventorySummary,
    getAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    getLiabilities,
    createLiability,
    updateLiability,
    deleteLiability,
}

module.exports.pool = pool;
