SELECT * FROM Customers;  

ALTER TABLE Orders ADD COLUMN actual_pouches INT(11) DEFAULT NULL;

ALTER TABLE Orders
  ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL;

ALTER TABLE Orders
  ADD COLUMN is_from_reservation TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE Reservations
  ADD COLUMN checked_in_at DATETIME NULL;

ALTER TABLE order_status_history
  ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;


CREATE TABLE IF NOT EXISTS `InventoryItems` (
    `item_id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `sku` varchar(100) DEFAULT NULL,
    `unit` varchar(50) NOT NULL DEFAULT 'unit',
    `category` varchar(100) DEFAULT NULL,
    `cost_center_id` int(11) DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`item_id`),
    UNIQUE KEY `name` (`name`),
    KEY `idx_inventory_cost_center` (`cost_center_id`),
    CONSTRAINT `InventoryItems_ibfk_1` FOREIGN KEY (`cost_center_id`) REFERENCES `CostCenters` (`center_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `InventoryTransactions` (
    `tx_id` int(11) NOT NULL AUTO_INCREMENT,
    `item_id` int(11) NOT NULL,
    `tx_type` enum('purchase','usage','adjustment') NOT NULL,
    `quantity` decimal(10,2) NOT NULL,
    `unit_cost` decimal(10,2) DEFAULT NULL,
    `total_cost` decimal(10,2) DEFAULT NULL,
    `cost_entry_id` int(11) DEFAULT NULL,
    `tx_date` date NOT NULL,
    `notes` text DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`tx_id`),
    KEY `idx_inventory_tx_item` (`item_id`),
    KEY `idx_inventory_tx_date` (`tx_date`),
    KEY `idx_inventory_cost_entry` (`cost_entry_id`),
    CONSTRAINT `InventoryTransactions_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `InventoryItems` (`item_id`) ON DELETE CASCADE,
    CONSTRAINT `InventoryTransactions_ibfk_2` FOREIGN KEY (`cost_entry_id`) REFERENCES `CostEntries` (`entry_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FixedAssets` (
    `asset_id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `category` varchar(100) DEFAULT NULL,
    `value` decimal(12,2) NOT NULL,
    `acquired_date` date NOT NULL,
    `notes` text DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Liabilities` (
    `liability_id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `category` varchar(100) DEFAULT NULL,
    `value` decimal(12,2) NOT NULL,
    `as_of_date` date NOT NULL,
    `notes` text DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`liability_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 

SELECT
  DATE(b.created_at) AS production_date,
  o.order_id,
  COALESCE(o.actual_pouches, o.pouches_count, 0) AS pouches_produced,
  o.total_cost
FROM (
  SELECT SUBSTRING(bx.box_id, 5, 36) AS order_id, MIN(bx.created_at) AS created_at
  FROM Boxes bx
  WHERE bx.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}(_|$)'
  GROUP BY order_id
) b
JOIN Orders o ON o.order_id = b.order_id
ORDER BY b.created_at DESC;


ALTER TABLE Orders DROP INDEX unique_customer_id;

-- Backfill Boxes.customer_id when the column is missing
ALTER TABLE Boxes
  ADD COLUMN customer_id VARCHAR(36) NULL;

UPDATE Boxes b
JOIN Orders o ON SUBSTRING(b.box_id, 5, 36) = o.order_id
SET b.customer_id = o.customer_id
WHERE b.customer_id IS NULL
  AND b.box_id REGEXP '^BOX_[0-9A-Fa-f-]{36}(_|$)';

ALTER TABLE Boxes
  ADD INDEX idx_boxes_customer_id (customer_id);

-- Add Boxes.pallet_id and Boxes.shelf_id when missing
ALTER TABLE Boxes
  ADD COLUMN pallet_id VARCHAR(36) NULL,
  ADD COLUMN shelf_id VARCHAR(255) NULL;

ALTER TABLE Boxes
  ADD INDEX idx_boxes_pallet (pallet_id),
  ADD INDEX idx_boxes_shelf_id (shelf_id);

-- Add Reservations.order_id to link reservations to orders
ALTER TABLE Reservations
  ADD COLUMN order_id VARCHAR(36) NULL;

CREATE INDEX idx_reservations_order_id ON Reservations(order_id);
