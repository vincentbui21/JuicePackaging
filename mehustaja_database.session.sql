SELECT * FROM Accounts  

ALTER TABLE Orders ADD COLUMN actual_pouches INT(11) DEFAULT NULL;

ALTER TABLE Orders
  ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL;



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
