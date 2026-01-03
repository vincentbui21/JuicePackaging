-- Migration: Remove UNIQUE constraint on customer_id in Orders table
-- Reason: Customers can have multiple orders, not just one
-- Date: 2026-01-03

USE myjuicedatabase;

-- Drop the UNIQUE constraint
ALTER TABLE Orders DROP INDEX unique_customer_id;

-- Verify the change
SHOW CREATE TABLE Orders;
