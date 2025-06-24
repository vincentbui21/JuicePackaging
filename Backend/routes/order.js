import express from 'express'
import { db } from '../db.js'

const router = express.Router()

router.post('/new-order', async (req, res) => {
  const { customer, order } = req.body

  try {
    const [customerResult] = await db.query(
      `INSERT INTO customers (full_name, address, city, phone_number, email, entry_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer.full_name, customer.address, customer.city, customer.phone_number, customer.email, customer.entryDate]
    )

    const customerId = customerResult.insertId

    await db.query(
      `INSERT INTO orders (customer_id, total_apple_weight, no_of_crates, juice_quantity, no_of_pouches, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customerId, order.total_apple_weight, order.No_of_Crates, order.Juice_quantity, order.No_of_Pouches, order.Notes]
    )

    res.status(201).json({ message: 'Order saved successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save order' })
  }
})

export default router
