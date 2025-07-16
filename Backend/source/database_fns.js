require('dotenv').config()
const mysql = require('mysql2');
const { generateUUID } = require('./uuid');
const logic = require("./mehustaja_logic")

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
            INSERT INTO Crates (crate_id, customer_id, status, updated_at, crate_order)
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
            logic.caculated_price(order_data.total_apple_weight), //will be caculated
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
        INSERT INTO Crates (crate_id, customer_id, status, updated_at, crate_order)
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
                c.name
            FROM Orders o
            JOIN Customers c ON o.customer_id = c.customer_id
            WHERE o.status = ?
        `, [status]);
    
        return rows;
    }

    async function markOrderAsDone(order_id, comment = "") {
        // 1. Update order status
        await pool.query(
          `UPDATE Orders SET status = ? WHERE order_id = ?`,
          ['processing complete', order_id]
        );
      
        // 2. Update crate status (via customer_id)
        await pool.query(
          `UPDATE Crates SET status = ? WHERE customer_id = (
            SELECT customer_id FROM Orders WHERE order_id = ?
          )`,
          ['processing complete', order_id]
        );
      
        // 3. Get customer_id and weight
        const [[order]] = await pool.query(
          `SELECT weight_kg, customer_id FROM Orders WHERE order_id = ?`,
          [order_id]
        );
      
        const estimatedPouches = Math.floor((order.weight_kg * 0.65) / 3);
        const boxCount = Math.ceil(estimatedPouches / 8);
      
        const inserts = [];
      
        for (let i = 1; i <= boxCount; i++) {
          const boxId = `CRATE_${order_id}_${i}`;
          inserts.push([boxId, order.customer_id]);
        }
      
        // 4. Insert into Boxes table (ignore duplicates)
        await pool.query(
          `INSERT IGNORE INTO Boxes (box_id, customer_id) VALUES ?`,
          [inserts]
        );
      }      
    
    async function updateOrderInfo(order_id, data) {
        const { weight_kg, estimated_pouches, estimated_boxes } = data;
      
        await pool.query(
          `UPDATE Orders SET weight_kg = ?, estimated_pouches = ?, estimated_boxes = ? WHERE order_id = ?`,
          [weight_kg, estimated_pouches, estimated_boxes, order_id]
        );
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
      
      async function deletePallet(pallet_id) {
        await pool.query(`DELETE FROM Pallets WHERE pallet_id = ?`, [pallet_id]);
      }
      
      
module.exports = {
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
    deletePallet
}