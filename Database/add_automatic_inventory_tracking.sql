-- Automatic Inventory Tracking Schema Update
-- This migration adds support for automatic inventory deduction when pouches are used
-- and proper COGS accounting on the balance sheet

USE myjuicedatabase;

-- 1. Add a special built-in "Pouches" inventory item (if not exists)
INSERT IGNORE INTO InventoryItems (item_id, name, sku, unit, category, cost_center_id, created_at, updated_at)
VALUES (1, 'Packaging Pouches', 'POUCH-001', 'units', 'Packaging', NULL, NOW(), NOW());

-- 2. Add a "COGS" cost center for automatic inventory usage entries
INSERT IGNORE INTO CostCenters (name, category, created_at, updated_at)
VALUES ('Cost of Goods Sold (Inventory)', 'direct', NOW(), NOW());

-- 3. Create a tracking table for auto-generated transactions (to prevent double-posting)
CREATE TABLE IF NOT EXISTS `AutoInventoryTransactions` (
    `auto_tx_id` int(11) NOT NULL AUTO_INCREMENT,
    `order_id` varchar(36) NOT NULL,
    `inventory_tx_id` int(11) DEFAULT NULL,
    `cost_entry_id` int(11) DEFAULT NULL,
    `pouch_count` int(11) NOT NULL,
    `unit_cost` decimal(10,2) DEFAULT NULL,
    `total_cost` decimal(10,2) DEFAULT NULL,
    `trigger_status` varchar(50) NOT NULL DEFAULT 'Processing complete',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`auto_tx_id`),
    UNIQUE KEY `unique_order` (`order_id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_inventory_tx` (`inventory_tx_id`),
    KEY `idx_cost_entry` (`cost_entry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Add column to track which transactions are system-generated
ALTER TABLE InventoryTransactions ADD COLUMN is_auto_generated TINYINT(1) DEFAULT 0 AFTER notes;
ALTER TABLE InventoryTransactions ADD COLUMN related_order_id varchar(36) DEFAULT NULL AFTER is_auto_generated;
ALTER TABLE InventoryTransactions ADD COLUMN created_by varchar(50) DEFAULT 'system' AFTER related_order_id;

-- 5. Add index for audit trail queries
CREATE INDEX idx_auto_generated ON InventoryTransactions(is_auto_generated, related_order_id);
CREATE INDEX idx_created_by ON InventoryTransactions(created_by);

-- 6. Track automatic cost entry generation
ALTER TABLE CostEntries ADD COLUMN is_inventory_adjustment TINYINT(1) DEFAULT 0 AFTER notes;
ALTER TABLE CostEntries ADD COLUMN related_order_id varchar(36) DEFAULT NULL AFTER is_inventory_adjustment;
CREATE INDEX idx_inventory_adjustment ON CostEntries(is_inventory_adjustment, related_order_id);
