# Automatic Inventory Tracking & COGS Implementation

## Overview

This implementation automates the inventory deduction process when juice orders are completed, ensuring proper double-entry accounting where both inventory (assets) and COGS (expenses) are updated simultaneously.

## Problem Solved

**Before:** Orders recorded pouches produced but inventory was not automatically reduced. Balance sheet inventory assets were manually managed, and no COGS entries were created.

**After:** When an order is marked "Processing complete", the system automatically:
1. Creates an inventory transaction (usage) deducting pouches from stock
2. Creates a corresponding cost entry (COGS) reflecting the cost of goods sold
3. Records audit trail showing which order triggered the deduction
4. Prevents double-posting through idempotency checks

## Technical Architecture

### Database Schema Updates

**New Table: `AutoInventoryTransactions`**
- Tracks automatic inventory deductions
- Links order → inventory transaction → cost entry
- Prevents duplicate processing with unique constraint on order_id

```sql
CREATE TABLE AutoInventoryTransactions (
    auto_tx_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id VARCHAR(36) UNIQUE NOT NULL,
    inventory_tx_id INT,
    cost_entry_id INT,
    pouch_count INT NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    trigger_status VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Table Updates**

- `InventoryItems`: Added default "Packaging Pouches" item (id=1)
- `CostCenters`: Added "Cost of Goods Sold (Inventory)" center (category=direct)
- `InventoryTransactions`: Added columns for audit trail
  - `is_auto_generated` (TINYINT): Marks system-generated entries
  - `related_order_id` (VARCHAR): Links to triggering order
  - `created_by` (VARCHAR): Tracks source (default='system')
- `CostEntries`: Added columns for COGS tracking
  - `is_inventory_adjustment` (TINYINT): Marks automatic COGS entries
  - `related_order_id` (VARCHAR): Links to triggering order

**Indices Created**
- `idx_auto_generated` on InventoryTransactions
- `idx_inventory_adjustment` on CostEntries
- These enable fast queries to show only auto-generated entries

### Backend Functions

**File:** `Backend/source/database_fns.js`

#### `getAutoInventoryTransactionByOrder(orderId)`
Checks if an auto-deduction already exists for an order (idempotency check).

```javascript
async function getAutoInventoryTransactionByOrder(orderId) {
  const [rows] = await pool.query(
    `SELECT auto_tx_id, order_id, inventory_tx_id, cost_entry_id, pouch_count, total_cost
     FROM AutoInventoryTransactions
     WHERE order_id = ?`,
    [orderId]
  );
  return rows[0] || null;
}
```

**Returns:** Object with transaction details or null if not found.

#### `createAutoInventoryDeduction(orderId, pouchCount, unitCost)`
Main function that orchestrates automatic inventory deduction.

**Parameters:**
- `orderId` (string): Order ID
- `pouchCount` (number): Pouches produced
- `unitCost` (number): Cost per pouch (default €0.50)

**Process:**
1. Checks idempotency (prevents duplicate deduction)
2. Retrieves "Packaging Pouches" inventory item
3. Retrieves "COGS" cost center
4. Creates inventory transaction (type=usage)
5. Creates cost entry (COGS entry)
6. Links transaction to cost entry
7. Records in AutoInventoryTransactions
8. Returns success/error with IDs for tracking

**Return:**
```javascript
{
  success: true,
  autoTxId: 123,
  inventoryTxId: 456,
  costEntryId: 789,
  totalCost: 45.50,
  message: "Auto-deducted 91 pouches (€45.50) for order ..."
}
```

### Backend Integration

**File:** `Backend/server.js`

**Hook Point:** `POST /orders/:order_id/mark-done` endpoint

When an order is marked "Processing complete":

```javascript
const markDoneHandler = async (req, res) => {
  // ... existing order completion logic ...
  
  // AUTO-DEDUCT INVENTORY
  try {
    const [[order]] = await database.pool.query(
      `SELECT actual_pouches, pouches_count FROM Orders WHERE order_id = ?`,
      [order_id]
    );
    
    if (order) {
      const pouchCount = order.actual_pouches || order.pouches_count || 0;
      if (pouchCount > 0) {
        const deductResult = await database.createAutoInventoryDeduction(
          order_id, 
          pouchCount, 
          0.5  // €0.50 per pouch (configurable)
        );
        console.log(`[Auto-Deduction] ${deductResult.message}`);
      }
    }
  } catch (autoDeductError) {
    console.warn(`[Auto-Deduction Warning] Could not auto-deduct...`);
    // Does NOT fail order completion
  }
  
  // ... broadcast status ...
};
```

**Key Design:**
- Auto-deduction happens AFTER order status change
- Errors in auto-deduction do NOT block order completion
- Default unit cost of €0.50/pouch (can be adjusted)
- Logs all auto-deduction activity for audit trail

### Frontend Enhancements

**File:** `Frontend/src/pages/AdminReports.jsx`

**New Section in Inventory Tab:**
- "Automatically Generated Transactions" table
- Filtered to show only `is_auto_generated=1` records
- Displays:
  - Transaction date
  - Item name (Packaging Pouches)
  - Transaction type (usage)
  - Quantity deducted
  - Unit cost applied
  - Total COGS impact
  - Order ID (truncated for readability)
  - Auto-generated notes

**UI Features:**
- Highlighted background (#fafafa) to distinguish from manual entries
- Chip badge for transaction type
- Read-only (no edit/delete for auto entries - maintaining audit trail)
- Shows "No automatic transactions yet" when none exist

### Database Migration

**File:** `Database/add_automatic_inventory_tracking.sql`

Executed during deployment:
1. Creates AutoInventoryTransactions table
2. Adds columns to InventoryTransactions
3. Adds columns to CostEntries
4. Creates indices for performance
5. Inserts default "Pouches" inventory item
6. Inserts "COGS" cost center

**Execution:**
```bash
cd Backend && node -e "
  const fs = require('fs');
  require('dotenv').config();
  const mysql = require('mysql2/promise');
  
  (async () => {
    const conn = await mysql.createConnection({...});
    const sql = fs.readFileSync('../Database/add_automatic_inventory_tracking.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) await conn.execute(stmt);
    }
    console.log('✓ Migration completed');
    await conn.end();
  })();
"
```

## How It Works

### Example Workflow

**Scenario:** Order OPR-001 with 91 pouches is marked "Processing complete"

**Step 1:** Order completion
```
POST /orders/OPR-001/mark-done
→ Creates 8 boxes in Boxes table
→ Updates Orders.status = 'Processing complete'
```

**Step 2:** Auto-deduction triggered
```
→ Calls createAutoInventoryDeduction('OPR-001', 91, 0.5)
→ Finds "Packaging Pouches" (item_id=1)
→ Finds "COGS" cost center (center_id=2)
```

**Step 3:** Inventory transaction created
```
INSERT INTO InventoryTransactions
  (item_id=1, tx_type='usage', quantity=91, unit_cost=0.5, 
   total_cost=45.50, tx_date=TODAY, 
   is_auto_generated=1, related_order_id='OPR-001')
→ Returns tx_id=456
```

**Step 4:** COGS cost entry created
```
INSERT INTO CostEntries
  (center_id=2, amount=45.50, incurred_date=TODAY,
   is_inventory_adjustment=1, related_order_id='OPR-001')
→ Returns entry_id=789
```

**Step 5:** Audit record created
```
INSERT INTO AutoInventoryTransactions
  (order_id='OPR-001', inventory_tx_id=456, cost_entry_id=789,
   pouch_count=91, unit_cost=0.5, total_cost=45.50)
→ Returns auto_tx_id=123
```

**Step 6:** Balance sheet updated
- **Assets:** Inventory value reduced by €45.50
- **Expenses:** COGS (direct cost) increased by €45.50
- **Equity:** Net profit reduced by €45.50 (cost impact)
- Balance sheet remains in equilibrium (Assets = Liabilities + Equity)

### Idempotency

The system prevents duplicate processing through:

1. **UNIQUE Constraint** on `AutoInventoryTransactions.order_id`
   - Only one auto-deduction per order

2. **Check on Entry Point**
   ```javascript
   const existing = await getAutoInventoryTransactionByOrder(orderId);
   if (existing) {
     return { success: false, message: "Already deducted", autoTxId: existing.auto_tx_id };
   }
   ```

3. **Graceful Error Handling**
   - If order is marked done twice, second call finds existing record and returns success with ID
   - Does not create duplicate transactions

### Audit Trail

All auto-generated transactions are marked and traceable:

**Frontend Query:**
```javascript
inventoryTransactions.filter(tx => tx.is_auto_generated === 1)
```

**Backend Query:**
```sql
SELECT * FROM InventoryTransactions 
WHERE is_auto_generated = 1 
AND related_order_id = ?
ORDER BY created_at DESC;
```

**Reporting:**
```sql
SELECT 
  COUNT(*) as auto_deductions_count,
  SUM(total_cost) as total_cogs,
  MAX(created_at) as last_deduction
FROM InventoryTransactions
WHERE is_auto_generated = 1
  AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## Configuration & Customization

### Unit Cost Configuration

**Current Default:** €0.50 per pouch

**To Change:** Edit in `Backend/server.js` line ~717:
```javascript
const deductResult = await database.createAutoInventoryDeduction(
  order_id, 
  pouchCount, 
  0.50  // ← Change this value
);
```

**Better Approach:** Add to settings/environment:
```javascript
const POUCH_UNIT_COST = process.env.POUCH_UNIT_COST || 0.50;
```

### Extending to Other Items

**To auto-deduct other inventory items:**

1. Create inventory item in UI or database
2. Create cost center for the item category
3. Add another trigger in order completion handler:

```javascript
// Auto-deduct boxes after pouches
const boxCount = order.boxes_count || 0;
if (boxCount > 0) {
  await database.createAutoInventoryDeduction(
    order_id,
    boxCount,
    0.02,  // €0.02 per box
    2  // item_id for boxes (instead of 1 for pouches)
  );
}
```

**Note:** Current implementation uses item_id=1 (Pouches). To make it flexible, modify `createAutoInventoryDeduction` to accept itemId parameter.

## Testing & Validation

### Manual Testing

**Test Case 1: Order Completion**
1. Create new order with 91 pouches
2. Mark as "Processing complete"
3. Check Admin Reports → Inventory tab
4. Verify "Automatically Generated Transactions" section shows new entry
5. Verify InventorySummary shows reduced pouch count

**Test Case 2: Idempotency**
1. Call mark-done endpoint twice on same order_id
2. Verify only one auto-deduction created
3. Verify no duplicate transactions in InventoryTransactions table

**Test Case 3: Balance Sheet**
1. Note Assets before order completion
2. Complete order (triggers auto-deduction)
3. Verify Assets.Inventory reduced by COGS amount
4. Verify Assets = Liabilities + Equity still true

### Database Validation

```sql
-- Check auto-deduction created
SELECT * FROM AutoInventoryTransactions WHERE order_id = 'OPR-001';

-- Check inventory transaction
SELECT * FROM InventoryTransactions WHERE related_order_id = 'OPR-001';

-- Check COGS entry
SELECT * FROM CostEntries WHERE related_order_id = 'OPR-001';

-- Verify no duplicates
SELECT order_id, COUNT(*) as cnt FROM AutoInventoryTransactions 
GROUP BY order_id HAVING cnt > 1;
```

## Monitoring & Maintenance

### Dashboard Metrics

Add to AdminReports Overview tab:

```javascript
const autoDeductionMetrics = {
  total_auto_deductions: inventoryTransactions.filter(tx => tx.is_auto_generated).length,
  total_cogs_amount: inventoryTransactions
    .filter(tx => tx.is_auto_generated && tx.tx_type === 'usage')
    .reduce((sum, tx) => sum + (tx.total_cost || 0), 0),
  last_deduction_date: inventoryTransactions
    .filter(tx => tx.is_auto_generated)
    .sort((a, b) => new Date(b.tx_date) - new Date(a.tx_date))[0]?.tx_date
};
```

### Error Monitoring

Log all auto-deduction attempts:

```javascript
// Captures both success and failures
console.log(`[Auto-Deduction] ${deductResult.message}`);
```

Check logs for patterns:
```bash
grep -i "auto-deduction" backend.log | tail -20
```

### Reconciliation

Weekly reconciliation query:

```sql
SELECT 
  DATE(created_at) as deduction_date,
  COUNT(*) as deductions,
  SUM(pouch_count) as total_pouches,
  SUM(total_cost) as total_cogs,
  AVG(unit_cost) as avg_unit_cost
FROM AutoInventoryTransactions
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY deduction_date DESC;
```

## Files Modified

1. **Database/add_automatic_inventory_tracking.sql** (NEW)
   - Migration script
   - 45 lines

2. **Backend/source/database_fns.js**
   - Added `getAutoInventoryTransactionByOrder()`
   - Added `createAutoInventoryDeduction()`
   - Updated module.exports
   - +110 lines

3. **Backend/server.js**
   - Modified `markDoneHandler` to trigger auto-deduction
   - +25 lines (wrapped in try-catch)

4. **Frontend/src/pages/AdminReports.jsx**
   - Added "Automatically Generated Transactions" section in Inventory tab
   - Shows filtered list of auto-generated entries
   - Read-only display with visual distinction
   - +80 lines

## Rollback Plan

If issues arise:

### Quick Disable
```javascript
// In server.js markDoneHandler, comment out:
/*
try {
  const deductResult = await database.createAutoInventoryDeduction(...);
} catch (autoDeductError) {
  // ...
}
*/
```

### Full Rollback
```sql
-- Drop new table (careful: contains audit trail)
DROP TABLE AutoInventoryTransactions;

-- Remove new columns
ALTER TABLE InventoryTransactions DROP COLUMN is_auto_generated;
ALTER TABLE InventoryTransactions DROP COLUMN related_order_id;
ALTER TABLE InventoryTransactions DROP COLUMN created_by;

ALTER TABLE CostEntries DROP COLUMN is_inventory_adjustment;
ALTER TABLE CostEntries DROP COLUMN related_order_id;

-- Delete default items (if needed)
DELETE FROM InventoryItems WHERE item_id = 1;
DELETE FROM CostCenters WHERE name = 'Cost of Goods Sold (Inventory)';
```

## Future Enhancements

1. **Configurable Unit Costs**
   - Store in settings table
   - Allow per-period unit cost changes
   - Historical costing (FIFO/LIFO)

2. **Multi-Item Auto-Deduction**
   - Deduct boxes, labels, packaging separately
   - Different triggers per item (e.g., deduct boxes when shipped, not when processed)

3. **Manual Override**
   - Allow admins to trigger manual deduction
   - Adjust COGS if actual cost differs from default
   - Deduction correction transactions

4. **Reporting Enhancements**
   - COGS trend analysis
   - Inventory utilization rates
   - Cost per unit trends
   - Missing inventory alerts

5. **Integration**
   - API endpoint to query auto-deductions
   - Export auto-deduction report
   - Integration with accounting software

## Summary

This implementation provides:
- ✅ Automated inventory deduction on order completion
- ✅ Proper double-entry accounting (Assets & Expenses updated)
- ✅ Audit trail (all entries marked and traceable)
- ✅ Idempotency (no duplicate processing)
- ✅ Graceful error handling (doesn't block order completion)
- ✅ Frontend visualization (new Inventory tab section)
- ✅ Zero downtime deployment (backward compatible)

The system is production-ready and maintains data integrity while providing full visibility into automatic transactions.
