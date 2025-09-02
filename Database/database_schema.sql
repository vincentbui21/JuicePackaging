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
    `notes` text DEFAULT NULL,
    `created_at` date DEFAULT NULL,
    `ready_at` datetime DEFAULT NULL,
    PRIMARY KEY (`order_id`),
    UNIQUE KEY `unique_customer_id` (`customer_id`),
    KEY `idx_orders_ready_at` (`ready_at`),
    CONSTRAINT `Orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `Customers` (`customer_id`)
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
