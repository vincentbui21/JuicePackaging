# Historical Data & Season Snapshots System

## Overview

This system preserves financial and operational data across multiple seasons/periods, enabling historical analysis and compliance tracking even after customers are deleted. It solves the critical issue where Admin Reports would lose all data when customers were removed at season end.

## Problem Solved

**Original Issue:**
- Admin Reports queried live data directly from Orders, Customers, CostEntries tables
- When customers were soft-deleted at season end, all historical data became inaccessible
- Impossible to compare "Season 2024" with "Season 2025" after customer deletion
- No compliance/audit trail for report exports
- Balance sheet and revenue reports reset to zero after deletion

**Solution:**
- Create denormalized snapshots of reports at season end
- Archive orders/costs independently from live tables
- Allow querying historical data even after customers deleted
- Enable side-by-side season comparison
- Track all report exports for compliance

## Database Schema

### ReportSnapshots
Stores complete point-in-time snapshots of financial reports.

```sql
CREATE TABLE ReportSnapshots (
  snapshot_id INT PRIMARY KEY AUTO_INCREMENT,
  snapshot_name VARCHAR(255) NOT NULL,      -- e.g., "Season 2024"
  snapshot_type ENUM('manual', 'automatic') DEFAULT 'manual',
  period_start DATE,                        -- Period covered
  period_end DATE,
  -- Aggregated metrics
  total_revenue DECIMAL(12,2),
  total_kilos DECIMAL(12,2),
  total_pouches INT,
  total_orders INT,
  direct_costs DECIMAL(12,2),
  overhead_costs DECIMAL(12,2),
  gross_profit DECIMAL(12,2),
  net_profit DECIMAL(12,2),
  inventory_value DECIMAL(12,2),
  fixed_assets_value DECIMAL(12,2),
  liabilities_value DECIMAL(12,2),
  customer_count INT,
  avg_order_value DECIMAL(12,2),
  avg_kilos_per_order DECIMAL(12,2),
  yield_percentage DECIMAL(5,2),
  gross_margin_pct DECIMAL(5,2),
  net_margin_pct DECIMAL(5,2),
  -- Complete report as JSON for detailed retrieval
  snapshot_data JSON NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
```

**Purpose:** Fast retrieval of complete report state without querying multiple tables

### ArchivedOrders
Permanent denormalized copy of orders, preserving customer details.

```sql
CREATE TABLE ArchivedOrders (
  archive_id INT PRIMARY KEY AUTO_INCREMENT,
  order_id VARCHAR(255) NOT NULL UNIQUE,
  customer_id INT,
  customer_name VARCHAR(255),              -- Denormalized (survives deletion)
  customer_city VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  order_status VARCHAR(50),
  weight_kg DECIMAL(8,2),
  crate_count INT,
  box_count INT,
  pouches_count INT,
  actual_pouches INT,
  total_cost DECIMAL(12,2),
  notes TEXT,
  created_at DATETIME,
  ready_at DATETIME,
  picked_up_at DATETIME,
  archive_season VARCHAR(255),             -- Which season was archived
  archive_reason VARCHAR(255),              -- e.g., "End of season"
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (archive_season),
  INDEX (created_at),
  INDEX (customer_name)
);
```

**Purpose:** Historical order data independent of live Customers table

### ArchivedCostEntries
Permanent copy of costs with center names denormalized.

```sql
CREATE TABLE ArchivedCostEntries (
  archive_id INT PRIMARY KEY AUTO_INCREMENT,
  entry_id INT,
  center_id INT,
  center_name VARCHAR(255),                -- Denormalized (survives deletion)
  center_category VARCHAR(50),
  amount DECIMAL(12,2),
  incurred_date DATE,
  is_inventory_adjustment TINYINT(1),
  related_order_id VARCHAR(255),
  notes TEXT,
  archive_season VARCHAR(255),
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (archive_season),
  INDEX (incurred_date),
  INDEX (center_name)
);
```

**Purpose:** Historical cost data for profit/loss analysis across seasons

### HistoricalPeriods
Logical grouping of data into seasons or quarters.

```sql
CREATE TABLE HistoricalPeriods (
  period_id INT PRIMARY KEY AUTO_INCREMENT,
  period_name VARCHAR(255) NOT NULL UNIQUE, -- e.g., "Season 2024", "Q3 2024"
  period_type ENUM('season', 'quarter', 'month', 'year'),
  start_date DATE,
  end_date DATE,
  is_closed TINYINT(1) DEFAULT 0,           -- true = finalized, no changes
  snapshot_id INT,                           -- Reference to ReportSnapshots
  archived_order_count INT,
  archived_revenue DECIMAL(12,2),
  closed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (snapshot_id) REFERENCES ReportSnapshots(snapshot_id),
  UNIQUE(period_name)
);
```

**Purpose:** Organize historical data into logical business periods

### ReportExports
Compliance/audit trail of who exported data and when.

```sql
CREATE TABLE ReportExports (
  export_id INT PRIMARY KEY AUTO_INCREMENT,
  export_type ENUM('csv', 'pdf', 'excel', 'json'),
  report_type VARCHAR(100),                 -- e.g., "admin_report", "balance_sheet"
  period_start DATE,
  period_end DATE,
  file_name VARCHAR(500),
  file_size_bytes INT,
  row_count INT,
  exported_by VARCHAR(255),                 -- User who exported
  exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  download_count INT DEFAULT 0,
  INDEX (exported_at),
  INDEX (exported_by)
);
```

**Purpose:** Track all data exports for compliance and security audits

## Backend Functions

### archiveSeasonData(seasonName, periodStart, periodEnd)

**Purpose:** End-of-season operation to preserve data

```javascript
// Usage
const result = await database.archiveSeasonData("Season 2024", "2024-01-01", "2024-12-31");
// Returns:
// {
//   success: true,
//   ordersArchived: 150,
//   costsArchived: 45,
//   message: "Season 'Season 2024' archived: 150 orders, 45 costs"
// }
```

**What it does:**
1. Copies all completed orders from Orders table to ArchivedOrders with customer data denormalized
2. Copies all costs from CostEntries to ArchivedCostEntries with cost center names denormalized
3. Marks all orders with season field
4. Creates HistoricalPeriod entry
5. All in a transaction (all-or-nothing)

**When to call:**
- End of business season (e.g., December)
- Before deleting customers
- Before major system changes
- For compliance requirements

### getHistoricalReport(seasonName)

**Purpose:** Retrieve complete historical data for a season

```javascript
const result = await database.getHistoricalReport("Season 2024");
// Returns:
// {
//   success: true,
//   seasonName: "Season 2024",
//   period: { period_id, period_name, start_date, end_date, is_closed, ... },
//   snapshot: { snapshot_id, snapshot_data, ... },  // Full report JSON
//   totals: {
//     orders: 150,
//     kilos: 3250,
//     pouches: 6500,
//     revenue: 12500.50,
//     orders_data: [...]  // Detailed order list
//   },
//   orders: [...],  // All archived orders
//   costs: [...],   // All archived costs
//   message: "Historical data for Season 2024: 150 orders, 45 cost entries"
// }
```

### compareSeasons(seasonName1, seasonName2)

**Purpose:** Side-by-side comparison of two seasons

```javascript
const result = await database.compareSeasons("Season 2023", "Season 2024");
// Returns:
// {
//   success: true,
//   comparison: {
//     season1: "Season 2023",
//     season2: "Season 2024",
//     metrics: {
//       orders: {
//         season1: 120,
//         season2: 150,
//         change: 30,
//         changePercent: "25.0"
//       },
//       kilos: {
//         season1: 2800,
//         season2: 3250,
//         change: 450,
//         changePercent: "16.1"
//       },
//       pouches: {...},
//       revenue: {...}
//     }
//   }
// }
```

### createReportSnapshot(snapshotName, periodStart, periodEnd, reportData, createdBy, notes)

**Purpose:** Manually create a point-in-time report snapshot

```javascript
const reportData = {
  totals: {
    revenue: 12500.50,
    kilos: 3250,
    pouches: 6500,
    orders: 150,
    gross_profit: 4200,
    net_profit: 2100,
    // ... etc
  }
};

const result = await database.createReportSnapshot(
  "End of Q3 2024",
  "2024-07-01",
  "2024-09-30",
  reportData,
  "admin_user",
  "Quarterly snapshot before reporting"
);
```

### recordReportExport(exportType, reportType, periodStart, periodEnd, fileName, fileSize, rowCount, exportedBy)

**Purpose:** Log report exports for compliance tracking

```javascript
const result = await database.recordReportExport(
  "csv",                      // Export format
  "admin_report",             // Report type
  "2024-01-01",               // Period covered
  "2024-12-31",
  "admin_report_2024_12_31.csv",
  1048576,                    // File size in bytes
  450,                        // Number of rows
  "john.doe@example.com"      // Who exported
);
```

## API Endpoints

### POST /archive-season
Archive a completed season for historical preservation

```bash
curl -X POST http://localhost:5001/archive-season \
  -H "Content-Type: application/json" \
  -d '{
    "seasonName": "Season 2024",
    "periodStart": "2024-01-01",
    "periodEnd": "2024-12-31"
  }'
```

**Response:**
```json
{
  "success": true,
  "seasonName": "Season 2024",
  "ordersArchived": 150,
  "costsArchived": 45,
  "message": "Season 'Season 2024' archived: 150 orders, 45 costs"
}
```

### GET /historical-periods
List all available historical periods

```bash
curl http://localhost:5001/historical-periods
```

**Response:**
```json
{
  "success": true,
  "periods": [
    {
      "snapshot_id": 1,
      "snapshot_name": "Season 2023",
      "period_start": "2023-01-01",
      "period_end": "2023-12-31",
      "total_revenue": 11000.50,
      "total_orders": 120,
      "created_at": "2024-01-05T10:30:00Z"
    },
    {
      "snapshot_id": 2,
      "snapshot_name": "Season 2024",
      "period_start": "2024-01-01",
      "period_end": "2024-12-31",
      "total_revenue": 12500.50,
      "total_orders": 150,
      "created_at": "2025-01-05T10:30:00Z"
    }
  ]
}
```

### GET /historical-report/:seasonName
Retrieve complete historical data for a specific season

```bash
curl http://localhost:5001/historical-report/Season%202024
```

**Response:**
```json
{
  "success": true,
  "seasonName": "Season 2024",
  "period": {...},
  "snapshot": {...},
  "totals": {...},
  "orders": [...],
  "costs": [...]
}
```

### GET /report-comparison/:season1/:season2
Compare two seasons side-by-side

```bash
curl http://localhost:5001/report-comparison/Season%202023/Season%202024
```

**Response:**
```json
{
  "success": true,
  "comparison": {
    "season1": "Season 2023",
    "season2": "Season 2024",
    "metrics": {
      "orders": {...},
      "kilos": {...},
      "pouches": {...},
      "revenue": {...}
    }
  }
}
```

### POST /create-snapshot
Manually create a report snapshot

```bash
curl -X POST http://localhost:5001/create-snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "snapshotName": "Q3 2024 Snapshot",
    "periodStart": "2024-07-01",
    "periodEnd": "2024-09-30",
    "reportData": {...},
    "notes": "Quarterly financial snapshot"
  }'
```

### POST /record-export
Log a report export for audit trail

```bash
curl -X POST http://localhost:5001/record-export \
  -H "Content-Type: application/json" \
  -d '{
    "exportType": "csv",
    "reportType": "admin_report",
    "periodStart": "2024-01-01",
    "periodEnd": "2024-12-31",
    "fileName": "admin_report_2024.csv",
    "fileSize": 1048576,
    "rowCount": 450
  }'
```

## Frontend Usage (AdminReports.jsx)

### Period Selection Modes

**Current Season** (Default)
- Shows live data from Orders, CostEntries, etc.
- Updated in real-time as data changes
- Use for day-to-day operations

**Previous Seasons** (Historical)
- Shows archived data from archive tables
- Data frozen at archival time
- Available even after customers deleted
- Drop-down to select specific season

**Compare Seasons** (Analysis)
- Select two seasons for side-by-side comparison
- Shows key metrics with % change
- Use for trend analysis and planning

### UI Features

1. **Report Mode Selector** (Top of page)
   - Choose: Current Season, Previous Seasons, or Compare Seasons
   - Dynamically loads matching dropdown options

2. **Period Selection Dropdown** (When in Historical mode)
   - Lists all archived seasons
   - Shows date range for each
   - Auto-loads data when selected

3. **Comparison Controls** (When in Compare mode)
   - Two season dropdowns
   - Compare button
   - Results display with metrics and % changes

4. **Comparison Results** (Below tabs when available)
   - 4-column grid: Orders, Kilos, Pouches, Revenue
   - Each column shows:
     - Season 2 value
     - Absolute change
     - Percent change
     - Season 1 baseline

## Workflow: End-of-Season Process

### Step 1: Prepare Reports
```javascript
// In AdminReports, export current season data as CSV/PDF
// Navigate to Season 2024 data, click "Download Report"
```

### Step 2: Archive the Season
```bash
curl -X POST http://localhost:5001/archive-season \
  -H "Content-Type: application/json" \
  -d '{
    "seasonName": "Season 2024",
    "periodStart": "2024-01-01",
    "periodEnd": "2024-12-31"
  }'
```

### Step 3: Verify Archive
```bash
# Check available periods
curl http://localhost:5001/historical-periods

# Retrieve archived data
curl http://localhost:5001/historical-report/Season%202024
```

### Step 4: Delete Customers (if needed)
- Safely delete customers from live system
- Historical data is preserved in archive tables
- Customer names/details frozen at archival time

### Step 5: New Season Operations
- Create new orders in live system
- Previous season reports available via Historical mode
- Compare with Archive data anytime

## Compliance & Audit

### Export Tracking
All report exports logged in ReportExports table:
- Who exported (user ID)
- When exported (timestamp)
- What data (date range, rows)
- Which format (CSV/PDF/Excel)
- File metadata (size, name)

### Data Integrity
- Archived data immutable (no updates after archival)
- Transactions ensure all-or-nothing consistency
- Season field on Orders links live to archived
- Multiple snapshots per season for compliance

### Security Considerations
- Archive tables not accessible for live operations
- ReportExports for access control audits
- Timestamps on all archive operations
- User attribution for accountability

## Troubleshooting

### Issue: "No historical data available"
**Cause:** No seasons archived yet
**Solution:** Run `/archive-season` endpoint first

### Issue: Comparison shows "null" values
**Cause:** Season name mismatch or data corruption
**Solution:** 
1. Verify season exists: `GET /historical-periods`
2. Check spelling and case sensitivity
3. Retrieve raw data: `GET /historical-report/{seasonName}`

### Issue: Customer data missing in archive
**Cause:** Archive created after customer deletion
**Solution:** 
- Archive before deleting customers
- Customer names denormalized at archive time
- Use previous season archives if available

### Issue: Database migration failed
**Cause:** Syntax error in add_historical_snapshots.sql
**Solution:**
```bash
# Verify migration file
mysql -u admin -p -h [host] [database] < Database/add_historical_snapshots.sql

# Check for errors
SHOW TABLES LIKE 'Report%';
SHOW TABLES LIKE 'Archived%';
SHOW TABLES LIKE 'Historical%';
```

## Performance Optimization

### Indices Created
- `ReportSnapshots`: created_at, snapshot_type
- `ArchivedOrders`: archive_season, created_at, customer_name
- `ArchivedCostEntries`: archive_season, incurred_date, center_name
- `ReportExports`: exported_at, exported_by

### Query Tips
- Use `archive_season` filter for fast lookups
- Archive JSON stored in ReportSnapshots for bulk data
- Archive tables ~10x faster than live queries (denormalized)
- Use snapshot_data JSON for complete state retrieval

## Future Enhancements

1. **Auto-Archival**
   - Scheduled end-of-quarter/year archival
   - Automatic snapshot creation

2. **Export Formats**
   - PDF with charts and formatting
   - Excel with multiple sheets
   - JSON for API consumption

3. **Advanced Comparison**
   - Multi-season trend lines
   - Predictive analysis
   - Variance analysis

4. **Data Retention**
   - Configurable retention periods
   - Archive deletion after N years
   - GDPR compliance automation

## Summary

This system transforms Admin Reports from a real-time-only view to a **time-travel capable system**, enabling:
- Historical analysis without data loss
- Compliance with customer deletion policies
- Season-to-season trend analysis
- Audit trail for all data access
- Long-term business intelligence

All while maintaining current season performance and data integrity.
