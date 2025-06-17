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
            INSERT INTO Crates (crate_id, order_id, status, updated_at, crate_order)
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
                orderID, //all crate have same orderID
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
        Crates.order_id

        FROM Customers
        INNER JOIN Orders ON Customers.customer_id = Orders.customer_id
        INNER JOIN Crates ON Crates.order_id = Orders.order_id

        WHERE Crates.crate_id = ?
        `

        const CratesGroupData =`
        SELECT c.crate_id, c.crate_order
        FROM Crates c
        INNER JOIN Crates c2 ON c.order_id = c2.order_id
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

async function update_order_status(order_id, new_status) {
    const connection = await pool.getConnection();

    try {
        const updateQuery = 
        `UPDATE Orders
        SET status = ?
        WHERE order_id = ?
        ;`

        await connection.query(updateQuery, [new_status, order_id]);

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


module.exports = {update_new_customer_data, get_crate_data, update_crates_status, update_order_status}