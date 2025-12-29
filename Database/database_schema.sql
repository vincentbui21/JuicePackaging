-- Create database
CREATE DATABASE IF NOT EXISTS myjuicedatabase;
USE myjuicedatabase;

-- Cities table
DROP TABLE IF EXISTS `Cities`;
CREATE TABLE `Cities` (
    `city_id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    PRIMARY KEY (`city_id`),
    UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Accounts table
DROP TABLE IF EXISTS `Accounts`;
CREATE TABLE `Accounts` (
    `id` varchar(50) NOT NULL,
    `password` varchar(255) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial admin account
INSERT INTO `Accounts` (`id`, `password`)
VALUES ('admin', 'newMehustaja@2025');

-- Customers table
DROP TABLE IF EXISTS `Customers`;
CREATE TABLE `Customers` (
    `customer_id` varchar(36) NOT NULL,
    `name` varchar(255) NOT NULL,
    `address` text DEFAULT NULL,
    `phone` varchar(50) DEFAULT NULL,
    `email` varchar(255) DEFAULT NULL,
    `city` text DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`customer_id`),
    KEY `idx_customers_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pallets table
DROP TABLE IF EXISTS `Pallets`;
CREATE TABLE `Pallets` (
    `pallet_id` varchar(36) NOT NULL,
    `section` varchar(36) DEFAULT NULL,
    `created_at` datetime DEFAULT current_timestamp(),
    PRIMARY KEY (`pallet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Boxes table
DROP TABLE IF EXISTS `Boxes`;
CREATE TABLE `Boxes` (
    `box_id` varchar(64) NOT NULL,
    `customer_id` varchar(36) DEFAULT NULL,
    `city` text DEFAULT NULL,
    `pallet_id` varchar(36) DEFAULT NULL,
    `created_at` datetime DEFAULT current_timestamp(),
    `pouch_count` int(11) DEFAULT 0,
    `shelf_id` varchar(255) DEFAULT NULL,
    PRIMARY KEY (`box_id`),
    KEY `customer_id` (`customer_id`),
    KEY `idx_boxes_pallet` (`pallet_id`),
    KEY `idx_boxes_shelf_id` (`shelf_id`),
    CONSTRAINT `Boxes_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `Customers` (`customer_id`),
    CONSTRAINT `fk_boxes_pallet` FOREIGN KEY (`pallet_id`) REFERENCES `Pallets` (`pallet_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crates table
DROP TABLE IF EXISTS `Crates`;
CREATE TABLE `Crates` (
    `crate_id` varchar(36) NOT NULL,
    `customer_id` varchar(36) DEFAULT NULL,
    `status` varchar(50) DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `crate_order` varchar(10) DEFAULT NULL,
    PRIMARY KEY (`crate_id`),
    KEY `customer_id` (`customer_id`),
    KEY `idx_crates_created_at` (`created_at`),
    CONSTRAINT `Crates_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `Customers` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table
DROP TABLE IF EXISTS `Orders`;
CREATE TABLE `Orders` (
    `order_id` varchar(36) NOT NULL,
    `customer_id` varchar(36) NOT NULL,
    `status` varchar(50) DEFAULT NULL,
    `weight_kg` decimal(10,2) DEFAULT NULL,
    `crate_count` int(11) DEFAULT NULL,
    `boxes_count` int(11) NOT NULL DEFAULT 0,
    `total_cost` decimal(10,2) DEFAULT NULL,
    `pouches_count` int(11) DEFAULT NULL,
    `actual_pouches` int(11) DEFAULT NULL,
    `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
    `deleted_at` datetime DEFAULT NULL,
    `notes` text DEFAULT NULL,
    `created_at` date DEFAULT NULL,
    `ready_at` datetime DEFAULT NULL,
    PRIMARY KEY (`order_id`),
    UNIQUE KEY `unique_customer_id` (`customer_id`),
    KEY `idx_orders_ready_at` (`ready_at`),
    CONSTRAINT `Orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `Customers` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cost centers table
DROP TABLE IF EXISTS `CostCenters`;
CREATE TABLE `CostCenters` (
    `center_id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `category` enum('direct','overhead') NOT NULL DEFAULT 'direct',
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`center_id`),
    UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cost entries table
DROP TABLE IF EXISTS `CostEntries`;
CREATE TABLE `CostEntries` (
    `entry_id` int(11) NOT NULL AUTO_INCREMENT,
    `center_id` int(11) NOT NULL,
    `amount` decimal(10,2) NOT NULL,
    `incurred_date` date NOT NULL,
    `notes` text DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT current_timestamp(),
    `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`entry_id`),
    KEY `idx_cost_entries_date` (`incurred_date`),
    KEY `idx_cost_entries_center_id` (`center_id`),
    CONSTRAINT `CostEntries_ibfk_1` FOREIGN KEY (`center_id`) REFERENCES `CostCenters` (`center_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory items table
DROP TABLE IF EXISTS `InventoryItems`;
CREATE TABLE `InventoryItems` (
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

-- Inventory transactions table
DROP TABLE IF EXISTS `InventoryTransactions`;
CREATE TABLE `InventoryTransactions` (
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

-- Fixed assets table
DROP TABLE IF EXISTS `FixedAssets`;
CREATE TABLE `FixedAssets` (
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

-- Liabilities table
DROP TABLE IF EXISTS `Liabilities`;
CREATE TABLE `Liabilities` (
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

-- Shelves table
DROP TABLE IF EXISTS `Shelves`;
CREATE TABLE `Shelves` (
    `shelf_id` varchar(36) NOT NULL,
    `location` varchar(255) DEFAULT NULL,
    `shelf_name` varchar(64) NOT NULL,
    `status` varchar(50) DEFAULT NULL,
    `capacity` int(11) DEFAULT NULL,
    `holding` int(11) DEFAULT NULL,
    `created_at` datetime DEFAULT current_timestamp(),
    PRIMARY KEY (`shelf_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS `CostCenters` (
  `center_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category` enum('direct','overhead') NOT NULL DEFAULT 'direct',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`center_id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
