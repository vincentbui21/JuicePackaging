# API Reference: Auto-Deduction Functions

## Backend Functions

### 1. `createAutoInventoryDeduction(orderId, pouchCount, unitCost = 0.5)`

**Purpose:** Automatically deduct pouches from inventory and create COGS entry when order completes.

**Location:** `Backend/source/database_fns.js`

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `orderId` | string | - | Order ID (UUID format) |
| `pouchCount` | number | - | Number of pouches to deduct |
| `unitCost` | number | 0.5 | Cost per pouch in euros |

**Returns:**

**Success Response:**
```javascript
{
  success: true,
  autoTxId: 123,           // AutoInventoryTransactions.auto_tx_id
  inventoryTxId: 456,      // InventoryTransactions.tx_id
  costEntryId: 789,        // CostEntries.entry_id
  totalCost: 45.50,        // Total COGS amount
  message: "Auto-deducted 91 pouches (€45.50) for order abc-123..."
}
```

**Error Response:**
```javascript
{
  success: false,
  autoTxId: 123,  // Only if already exists
  message: "Error description"
}
```

**Example Usage:**

```javascript
const result = await database.createAutoInventoryDeduction('order-abc-123', 91, 0.50);

if (result.success) {
  console.log(`✓ Deducted ${result.totalCost}€`);
  // Use result.autoTxId, result.inventoryTxId, result.costEntryId for tracking
} else {
  console.log(`✗ Failed: ${result.message}`);
}
```

**Side Effects:**
- Creates InventoryTransactions row
- Creates CostEntries row
- Creates AutoInventoryTransactions row
- Updates balance sheet (Assets decrease, Expenses increase)

**Transaction Safety:** ✅ Fully transactional (rollback on any error)

**Idempotency:** ✅ Safe to call multiple times on same order

---

### 2. `getAutoInventoryTransactionByOrder(orderId)`

**Purpose:** Retrieve existing auto-deduction record for an order.

**Location:** `Backend/source/database_fns.js`

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `orderId` | string | Order ID (UUID format) |

**Returns:**

**Found:**
```javascript
{
  auto_tx_id: 123,
  order_id: "order-abc-123",
  inventory_tx_id: 456,
  cost_entry_id: 789,
  pouch_count: 91,
  total_cost: 45.50
}
```

**Not Found:**
```javascript
null
```

**Example Usage:**

```javascript
const existing = await database.getAutoInventoryTransactionByOrder('order-abc-123');

if (existing) {
  console.log(`Already deducted: ${existing.total_cost}€`);
} else {
  console.log('No deduction found');
}
```

---

## REST API Endpoints

### Auto-Deduction Trigger Point

**Endpoint:** `POST /orders/:order_id/mark-done`

**Behavior:**
1. Marks order as "Processing complete"
2. Creates boxes in inventory
3. **Automatically triggers `createAutoInventoryDeduction()`**

**Request:**
```http
POST /orders/abc-123/mark-done HTTP/1.1
Content-Type: application/json

{
  "comment": "Order completed and ready"
}
```

**Response:**
```json
{
  "message": "Order marked as done",
  "created": 8,
  "boxes_count": 8,
  "estimatedPouches": null,
  "boxCount": 8
}
```

**Behind the Scenes:**
```
1. Update Orders.status = 'Processing complete'
2. Create 8 boxes (BOX_abc-123_1, ..., BOX_abc-123_8)
3. Call createAutoInventoryDeduction('abc-123', 91, 0.5)
4. Emit WebSocket event: 'order-status-updated'
5. Log activity: 'Order processing completed'
```

**No separate endpoint exists** for manual auto-deduction (by design - maintains automation).

---

## Database Schema Reference

### AutoInventoryTransactions Table

```sql
CREATE TABLE AutoInventoryTransactions (
  auto_tx_id INT PRIMARY KEY AUTO_INCREMENT,
  order_id VARCHAR(36) NOT NULL UNIQUE,
  inventory_tx_id INT,
  cost_entry_id INT,
  pouch_count INT NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  trigger_status VARCHAR(50) NOT NULL DEFAULT 'Processing complete',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Key Constraints:**
- `order_id` is UNIQUE (one deduction per order)
- `order_id` has INDEX for fast lookups
- No foreign keys (soft links to maintain referential integrity)

**Query Examples:**

```sql
-- Find deduction for specific order
SELECT * FROM AutoInventoryTransactions 
WHERE order_id = 'abc-123';

-- Find all deductions in date range
SELECT * FROM AutoInventoryTransactions 
WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01'
ORDER BY created_at DESC;

-- Sum COGS for period
SELECT SUM(total_cost) as total_cogs 
FROM AutoInventoryTransactions 
WHERE DATE(created_at) = CURDATE();

-- Find problematic orders (multiple deductions)
SELECT order_id, COUNT(*) as cnt 
FROM AutoInventoryTransactions 
GROUP BY order_id HAVING cnt > 1;  -- Should be empty
```

---

### InventoryTransactions Auto-Deduction Fields

```sql
-- Fields added to track auto-generated entries:
ALTER TABLE InventoryTransactions 
ADD COLUMN is_auto_generated TINYINT(1) DEFAULT 0,
ADD COLUMN related_order_id VARCHAR(36) DEFAULT NULL,
ADD COLUMN created_by VARCHAR(50) DEFAULT 'system';
```

**Sample Row (Auto-Generated):**
```sql
SELECT * FROM InventoryTransactions WHERE tx_id = 456;

tx_id:              456
item_id:            1  (Packaging Pouches)
tx_type:            'usage'
quantity:           91
unit_cost:          0.50
total_cost:         45.50
tx_date:            2024-01-15
notes:              'Auto-deducted from order abc-123'
is_auto_generated:  1  ← Marks as automatic
related_order_id:   'abc-123'  ← Links to order
created_by:         'system'
```

**Query: Get all auto-deducted pouches for date range:**
```sql
SELECT 
  DATE(tx_date) as deduction_date,
  SUM(quantity) as pouches_used,
  SUM(total_cost) as total_cogs,
  COUNT(*) as deduction_count
FROM InventoryTransactions
WHERE is_auto_generated = 1 
  AND tx_type = 'usage'
  AND DATE(tx_date) BETWEEN '2024-01-01' AND '2024-01-31'
GROUP BY DATE(tx_date)
ORDER BY deduction_date DESC;
```

---

### CostEntries Auto-Deduction Fields

```sql
-- Fields added to track auto-generated COGS entries:
ALTER TABLE CostEntries 
ADD COLUMN is_inventory_adjustment TINYINT(1) DEFAULT 0,
ADD COLUMN related_order_id VARCHAR(36) DEFAULT NULL;
```

**Sample Row (Auto-Generated COGS):**
```sql
SELECT * FROM CostEntries WHERE entry_id = 789;

entry_id:                789
center_id:               2  (Cost of Goods Sold - Inventory)
amount:                  45.50
incurred_date:           2024-01-15
notes:                   'COGS: 91 pouches @ €0.50/unit for order abc-123'
is_inventory_adjustment: 1  ← Marks as automatic COGS
related_order_id:        'abc-123'  ← Links to order
```

---

## Data Consistency Guarantees

### Invariants Maintained

1. **One Deduction Per Order**
   ```sql
   SELECT COUNT(*) FROM AutoInventoryTransactions 
   WHERE order_id = ?;  -- Always returns 0 or 1
   ```

2. **Linked Triple**
   ```sql
   SELECT * FROM AutoInventoryTransactions WHERE order_id = ?;
   -- Guarantees:
   --   inventory_tx_id → InventoryTransactions row exists
   --   cost_entry_id → CostEntries row exists
   --   related_order_id → Orders row exists
   ```

3. **Inventory Balance**
   ```
   Before:  Pouches on-hand = X
   After:   Pouches on-hand = X - 91
   ```

4. **Balance Sheet Equation**
   ```
   Before: Assets = Liabilities + Equity
   After:  (Assets - 45.50) = Liabilities + (Equity - 45.50)
   Still:  Assets = Liabilities + Equity ✓
   ```

---

## Error Handling

### Possible Error Scenarios

**1. Order Not Found**
```javascript
{
  success: false,
  message: "Error: Order not found"
}
```
Response: 200 OK (graceful error, order completion succeeds)

**2. Pouches Inventory Item Missing**
```javascript
{
  success: false,
  message: "Error: Pouches inventory item not found. Run database migration first."
}
```
**Solution:** Execute migration: `Database/add_automatic_inventory_tracking.sql`

**3. COGS Cost Center Missing**
```javascript
{
  success: false,
  message: "Error: COGS cost center not found. Run database migration first."
}
```
**Solution:** Execute migration: `Database/add_automatic_inventory_tracking.sql`

**4. Already Deducted**
```javascript
{
  success: false,
  message: "Auto-deduction already exists for order abc-123",
  autoTxId: 123
}
```
**Behavior:** Idempotent (safe to call again)

**5. Database Connection Error**
```javascript
{
  success: false,
  message: "Error: Connection timeout"
}
```
**Impact:** Order completion still succeeds (error doesn't block)

---

## Monitoring & Observability

### Logs

**Success:**
```
[Auto-Deduction] Auto-deducted 91 pouches (€45.50) for order abc-123
```

**Warning:**
```
[Auto-Deduction Warning] Could not auto-deduct for abc-123: Network timeout
```

**Error:**
```
ERROR [createAutoInventoryDeduction] Failure for abc-123: COGS cost center not found
```

### Metrics to Track

```javascript
// In monitoring dashboard:
{
  "auto_deductions_daily": 45,           // Count per day
  "auto_deductions_total_cogs": 22750,   // Total amount
  "auto_deductions_avg_pouches": 101,    // Average pouches per order
  "auto_deductions_errors": 0,           // Failures
  "auto_deductions_last_run": "2024-01-15T14:30:00Z"
}
```

### Audit Query

```sql
-- Audit trail: All auto-deductions in period
SELECT 
  a.auto_tx_id,
  a.order_id,
  o.customer_id,
  c.name as customer_name,
  a.pouch_count,
  a.total_cost,
  a.created_at,
  t.tx_id,
  e.entry_id
FROM AutoInventoryTransactions a
JOIN Orders o ON a.order_id = o.order_id
JOIN Customers c ON o.customer_id = c.customer_id
LEFT JOIN InventoryTransactions t ON a.inventory_tx_id = t.tx_id
LEFT JOIN CostEntries e ON a.cost_entry_id = e.entry_id
WHERE DATE(a.created_at) = CURDATE()
ORDER BY a.created_at DESC;
```

---

## Integration Examples

### Custom Integration: Trigger Manual Deduction

```javascript
// If you need to manually trigger deduction (rare case)
const database = require('./source/database_fns');

async function manualDeductPouch(orderId, pouchCount) {
  try {
    const result = await database.createAutoInventoryDeduction(
      orderId,
      pouchCount,
      0.50  // or use custom unit cost
    );
    
    if (result.success) {
      console.log(`✓ Manual deduction created`);
      return result;
    } else {
      console.warn(`⚠ Deduction not needed: ${result.message}`);
      return result;
    }
  } catch (error) {
    console.error(`✗ Manual deduction failed:`, error);
    throw error;
  }
}

// Usage:
await manualDeductPouch('order-abc-123', 91);
```

### Integration: External Accounting System

```javascript
// Export auto-deductions to external system
async function syncAutoDeductionsToAccounting() {
  const [rows] = await pool.query(
    `SELECT a.*, o.customer_id, c.name 
     FROM AutoInventoryTransactions a
     JOIN Orders o ON a.order_id = o.order_id
     JOIN Customers c ON o.customer_id = c.customer_id
     WHERE DATE(a.created_at) = CURDATE()`
  );
  
  for (const deduction of rows) {
    await accountingSystem.postJournalEntry({
      date: deduction.created_at,
      debit: {
        account: 'COGS',  // Expense
        amount: deduction.total_cost
      },
      credit: {
        account: 'Inventory',  // Asset
        amount: deduction.total_cost
      },
      reference: deduction.order_id,
      description: `Pouch usage from order ${deduction.name}`
    });
  }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial release |

## Support & Questions

For issues or questions:
1. Check `INVENTORY_AUTOMATION_IMPLEMENTATION.md` for detailed documentation
2. Review database queries in "Database Schema Reference" section
3. Check logs with pattern: `grep -i "auto-deduction"`
4. Verify migration was executed: `SELECT * FROM AutoInventoryTransactions LIMIT 1;`
