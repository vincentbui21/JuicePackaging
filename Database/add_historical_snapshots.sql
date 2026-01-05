-- Historical Data Snapshots & Archive System
-- Preserves financial data even after customers are deleted
-- Enables season-over-season comparison and trend analysis

USE myjuicedatabase;

-- ============================================================================
-- 1. REPORT SNAPSHOTS TABLE - Captures entire report state at point in time
-- ============================================================================
-- This is a denormalized snapshot of complete report data taken at key moments
-- (end of season, monthly close, etc.)

CREATE TABLE IF NOT EXISTS `ReportSnapshots` (
    `snapshot_id` INT NOT NULL AUTO_INCREMENT,
    `snapshot_name` VARCHAR(100) NOT NULL,  -- e.g., "Season 2024", "December 2024"
    `snapshot_type` ENUM('manual', 'scheduled', 'end_of_season') DEFAULT 'manual',
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `total_revenue` DECIMAL(12,2) DEFAULT 0,
    `total_kilos` DECIMAL(10,2) DEFAULT 0,
    `total_pouches` INT DEFAULT 0,
    `total_orders` INT DEFAULT 0,
    `direct_costs` DECIMAL(12,2) DEFAULT 0,
    `overhead_costs` DECIMAL(12,2) DEFAULT 0,
    `gross_profit` DECIMAL(12,2) DEFAULT 0,
    `net_profit` DECIMAL(12,2) DEFAULT 0,
    `inventory_value` DECIMAL(12,2) DEFAULT 0,
    `fixed_assets_value` DECIMAL(12,2) DEFAULT 0,
    `liabilities_value` DECIMAL(12,2) DEFAULT 0,
    `customer_count` INT DEFAULT 0,
    `avg_order_value` DECIMAL(10,2) DEFAULT 0,
    `avg_kilos_per_order` DECIMAL(10,2) DEFAULT 0,
    `yield_percentage` DECIMAL(5,2) DEFAULT 0,
    `gross_margin_pct` DECIMAL(5,2) DEFAULT 0,
    `net_margin_pct` DECIMAL(5,2) DEFAULT 0,
    `snapshot_data` JSON,  -- Full detailed data for drilling down
    `created_by` VARCHAR(50) DEFAULT 'system',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT,
    PRIMARY KEY (`snapshot_id`),
    KEY `idx_period` (`period_start`, `period_end`),
    KEY `idx_type` (`snapshot_type`),
    KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. ARCHIVED ORDERS TABLE - Denormalized copy of completed orders
-- ============================================================================
-- Stores permanent copy of order data even after customer is deleted
-- Used for historical reports and trend analysis

CREATE TABLE IF NOT EXISTS `ArchivedOrders` (
    `archived_order_id` INT NOT NULL AUTO_INCREMENT,
    `order_id` VARCHAR(36) NOT NULL UNIQUE,
    `customer_id` VARCHAR(36),
    `customer_name` VARCHAR(100) NOT NULL,
    `customer_city` VARCHAR(50),
    `customer_phone` VARCHAR(20),
    `customer_email` VARCHAR(100),
    `order_status` VARCHAR(50) DEFAULT 'Picked up',
    `weight_kg` DECIMAL(10,2) DEFAULT 0,
    `crate_count` INT DEFAULT 0,
    `box_count` INT DEFAULT 0,
    `pouches_count` INT DEFAULT 0,
    `actual_pouches` INT DEFAULT 0,
    `total_cost` DECIMAL(12,2) DEFAULT 0,
    `notes` TEXT,
    `created_at` DATETIME,
    `ready_at` DATETIME,
    `picked_up_at` DATETIME,
    `archived_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `archive_season` VARCHAR(50),  -- e.g., "Season 2024", "Q4 2024"
    `archive_reason` VARCHAR(100),  -- e.g., "End of season", "Customer deletion"
    PRIMARY KEY (`archived_order_id`),
    UNIQUE KEY `unique_order_id` (`order_id`),
    KEY `idx_customer_name` (`customer_name`),
    KEY `idx_city` (`customer_city`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_archive_season` (`archive_season`),
    KEY `idx_archived_at` (`archived_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. ARCHIVED COST ENTRIES TABLE - Historical cost/expense data
-- ============================================================================
-- Preserves cost entries for deleted cost centers or historical analysis

CREATE TABLE IF NOT EXISTS `ArchivedCostEntries` (
    `archived_entry_id` INT NOT NULL AUTO_INCREMENT,
    `entry_id` INT,
    `center_id` INT,
    `center_name` VARCHAR(100),
    `center_category` VARCHAR(50),
    `amount` DECIMAL(12,2) NOT NULL,
    `incurred_date` DATE NOT NULL,
    `is_inventory_adjustment` TINYINT(1) DEFAULT 0,
    `related_order_id` VARCHAR(36),
    `notes` TEXT,
    `archived_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `archive_season` VARCHAR(50),
    PRIMARY KEY (`archived_entry_id`),
    KEY `idx_center` (`center_name`, `center_category`),
    KEY `idx_date` (`incurred_date`),
    KEY `idx_season` (`archive_season`),
    KEY `idx_archived` (`archived_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. HISTORICAL PERIODS TABLE - Define seasons/reporting periods
-- ============================================================================
-- Organizes data into logical periods (seasons, months, years)

CREATE TABLE IF NOT EXISTS `HistoricalPeriods` (
    `period_id` INT NOT NULL AUTO_INCREMENT,
    `period_name` VARCHAR(100) NOT NULL UNIQUE,  -- e.g., "Season 2024", "Q4 2024"
    `period_type` ENUM('season', 'quarter', 'month', 'year', 'custom') DEFAULT 'season',
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `is_closed` TINYINT(1) DEFAULT 0,  -- true when period is archived
    `snapshot_id` INT,
    `archived_order_count` INT DEFAULT 0,
    `archived_revenue` DECIMAL(12,2) DEFAULT 0,
    `description` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `closed_at` DATETIME,
    PRIMARY KEY (`period_id`),
    UNIQUE KEY `period_name_idx` (`period_name`),
    KEY `idx_dates` (`start_date`, `end_date`),
    KEY `idx_closed` (`is_closed`),
    FOREIGN KEY (`snapshot_id`) REFERENCES `ReportSnapshots`(`snapshot_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. REPORT EXPORTS TABLE - Track exported reports for compliance
-- ============================================================================
-- Records of who exported what data and when

CREATE TABLE IF NOT EXISTS `ReportExports` (
    `export_id` INT NOT NULL AUTO_INCREMENT,
    `export_type` ENUM('csv', 'pdf', 'json', 'excel') DEFAULT 'csv',
    `report_type` VARCHAR(50),  -- 'admin_report', 'snapshot', etc.
    `period_start` DATE,
    `period_end` DATE,
    `snapshot_id` INT,
    `file_name` VARCHAR(255),
    `file_size_bytes` INT,
    `row_count` INT,
    `exported_by` VARCHAR(100),  -- User who exported
    `exported_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `download_count` INT DEFAULT 0,
    `last_downloaded_at` DATETIME,
    `expires_at` DATETIME,  -- Optional: delete old exports
    PRIMARY KEY (`export_id`),
    KEY `idx_type` (`export_type`, `report_type`),
    KEY `idx_exported` (`exported_at`),
    FOREIGN KEY (`snapshot_id`) REFERENCES `ReportSnapshots`(`snapshot_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. Add Season Column to Existing Tables
-- ============================================================================
-- Links current data to specific seasons/periods

ALTER TABLE Orders ADD COLUMN IF NOT EXISTS season VARCHAR(50) DEFAULT NULL AFTER notes;
ALTER TABLE Orders ADD KEY IF NOT EXISTS idx_season (season);

ALTER TABLE Customers ADD COLUMN IF NOT EXISTS archive_season VARCHAR(50) DEFAULT NULL AFTER city;
ALTER TABLE Customers ADD KEY IF NOT EXISTS idx_customer_season (archive_season);

-- ============================================================================
-- 7. Create Indices for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_snapshot_period ON ReportSnapshots(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_archived_season ON ArchivedOrders(archive_season, created_at);
CREATE INDEX IF NOT EXISTS idx_archived_cost_season ON ArchivedCostEntries(archive_season, incurred_date);
CREATE INDEX IF NOT EXISTS idx_historical_period_dates ON HistoricalPeriods(start_date, end_date);

-- ============================================================================
-- 8. Insert Sample Historical Period (for testing/demonstration)
-- ============================================================================
-- This shows the expected format for season names

INSERT IGNORE INTO HistoricalPeriods 
  (period_name, period_type, start_date, end_date, is_closed, description)
VALUES 
  ('Season 2024', 'season', '2024-01-01', '2024-12-31', 0, 'Complete 2024 season - ready for archival');

-- ============================================================================
-- USAGE NOTES:
-- ============================================================================
-- 1. End of Season Process:
--    a. Create a HistoricalPeriod entry
--    b. Call archive_season_data() to move orders/costs to archive tables
--    c. Create a ReportSnapshot for the period
--    d. Mark HistoricalPeriod.is_closed = 1
--    e. Allow customers to be soft-deleted
--
-- 2. Accessing Historical Data:
--    - Always include period/season in queries
--    - Use ArchivedOrders when customer is deleted
--    - Use ReportSnapshots for historical reports
--
-- 3. Data Integrity:
--    - Never hard-delete from archive tables
--    - Archive tables are append-only (except for corrections)
--    - Use archive_reason to track why data was archived
--
-- 4. Performance:
--    - Index heavily on season, dates
--    - Consider partitioning by archive_season for very large tables
--    - Archive old report exports to separate storage

COMMIT;
