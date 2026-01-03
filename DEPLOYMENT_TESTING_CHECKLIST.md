# Deployment & Testing Checklist

## Pre-Deployment Verification ✅

- [x] Code syntax validation passed (all 3 files)
- [x] Database migration executed successfully
- [x] No compilation errors in backend
- [x] No compilation errors in frontend
- [x] Backward compatibility verified (no breaking changes)
- [x] All error handling in place
- [x] Idempotency checks implemented
- [x] Transaction safety verified

## Database Deployment

### Migration Verification

```bash
# SSH into database server or run locally:
mysql -u admin -ppassword myjuicedatabase -e "
  -- Check new table exists
  SELECT * FROM AutoInventoryTransactions LIMIT 1;
  
  -- Check new columns exist
  SHOW COLUMNS FROM InventoryTransactions LIKE 'is_auto_generated%';
  SHOW COLUMNS FROM CostEntries LIKE 'is_inventory_adjustment%';
  
  -- Check default items created
  SELECT * FROM InventoryItems WHERE item_id = 1;
  SELECT * FROM CostCenters WHERE name LIKE 'COGS%';
"
```

**Expected Results:**
```
✓ AutoInventoryTransactions table exists (empty initially)
✓ InventoryTransactions has is_auto_generated column (INT)
✓ InventoryTransactions has related_order_id column (VARCHAR)
✓ CostEntries has is_inventory_adjustment column (INT)
✓ InventoryItems has 'Packaging Pouches' with id=1
✓ CostCenters has 'Cost of Goods Sold (Inventory)'
```

---

## Backend Testing

### 1. Function Availability Test

```bash
cd Backend
node -e "
  const db = require('./source/database_fns');
  
  console.log('✓ createAutoInventoryDeduction available:', 
    typeof db.createAutoInventoryDeduction === 'function');
  console.log('✓ getAutoInventoryTransactionByOrder available:', 
    typeof db.getAutoInventoryTransactionByOrder === 'function');
"
```

### 2. Order Completion Test

**Step 1:** Create test order
```
POST http://localhost:3000/customers
{
  "name": "Test Customer",
  "phone": "1234567890",
  "email": "test@example.com",
  "city": "Helsinki",
  "weight": 100,
  "crate_count": 8
}
```
Response: Get `customer_id`

**Step 2:** Mark order as done
```
POST http://localhost:3000/orders/{order_id}/mark-done
{
  "comment": "Test completion"
}
```
Response: `200 OK`

**Step 3:** Verify auto-deduction in database
```sql
SELECT * FROM AutoInventoryTransactions 
WHERE order_id = '{order_id}' LIMIT 1;
```
Expected: Single row with pouch_count, total_cost, etc.

### 3. Idempotency Test

```
POST http://localhost:3000/orders/{order_id}/mark-done (call again)
{
  "comment": "Testing duplicate"
}
```
Response: `200 OK` (should succeed without error)

**Verify:** No duplicate entries created
```sql
SELECT COUNT(*) FROM AutoInventoryTransactions 
WHERE order_id = '{order_id}';
-- Expected: 1 (not 2)
```

### 4. Error Handling Test

Test missing prerequisites:
```sql
DELETE FROM CostCenters 
WHERE name = 'Cost of Goods Sold (Inventory)';
```

```
POST http://localhost:3000/orders/{new_order_id}/mark-done
```

Expected: Order completes successfully despite auto-deduction error
```
Response: 200 OK
Logs: "[Auto-Deduction Warning] Could not auto-deduct..."
```

Restore the cost center:
```sql
INSERT INTO CostCenters (name, category) 
VALUES ('Cost of Goods Sold (Inventory)', 'direct');
```

---

## Frontend Testing

### 1. Component Rendering Test

1. Open Admin Reports page
2. Navigate to "Inventory" tab
3. Scroll down to "Automatically Generated Transactions" section

**Expected:**
- Section title visible
- Description: "These transactions are automatically created..."
- Table with columns: Date, Item, Type, Qty, Unit cost, Total, Order ID, Notes
- Message: "No automatic transactions yet..." (if none exist)

### 2. Auto-Generated Transactions Display Test

After completing an order (from Backend Testing Step 2):

1. Refresh Admin Reports page
2. Go to Inventory tab
3. Look for "Automatically Generated Transactions" section

**Expected:**
- Row appears in table
- Item: "Packaging Pouches"
- Type: Chip showing "usage"
- Qty: matches pouches in order
- Total: €45.50 (or actual amount)
- Order ID: First 8 chars of order UUID + "..."
- Background color: Light gray (#fafafa)

### 3. Filter Verification Test

In Inventory tab:

1. Set date range to exclude today
2. Refresh data
3. "Automatically Generated Transactions" should be empty or reduced

1. Set date range back to today
2. Refresh data
3. Auto-generated entries reappear

**Expected:** Transactions properly filtered by date range

### 4. No Edit/Delete Test

Attempt to click Edit or Delete on auto-generated transaction:

**Expected:** No icons visible (read-only design)

---

## Integration Testing

### 1. Balance Sheet Consistency Test

**Step 1:** Note current balance sheet
```
Admin Reports → Statements tab
Record: Total Assets, Total Liabilities, Total Equity
Verify: Assets = Liabilities + Equity ✓
```

**Step 2:** Complete an order with auto-deduction
```
POST /orders/{order_id}/mark-done
```

**Step 3:** Refresh balance sheet
```
Go back to Admin Reports → Statements tab
Calculate change:
  ΔAssets = old Assets - new Assets (should be positive)
  ΔCOGS = new COGS - old COGS (should be positive)
  ΔEquity = new Equity - old Equity (should be negative, exactly = ΔCOGS)
```

**Expected:**
```
ΔAssets = 45.50 (inventory reduced)
ΔCOGS = 45.50 (expenses increased)
ΔEquity = -45.50 (profit reduced)
Assets = Liabilities + Equity ✓ (still balanced)
```

### 2. Multi-Order Sequence Test

Complete 5 orders in sequence:
- Order 1: 91 pouches (€45.50)
- Order 2: 110 pouches (€55.00)
- Order 3: 75 pouches (€37.50)
- Order 4: 88 pouches (€44.00)
- Order 5: 102 pouches (€51.00)

**Verify:**
```sql
SELECT 
  COUNT(*) as deduction_count,
  SUM(pouch_count) as total_pouches,
  SUM(total_cost) as total_cogs
FROM AutoInventoryTransactions;

-- Expected:
-- deduction_count = 5
-- total_pouches = 466
-- total_cogs = 233.00
```

Frontend should show 5 entries in "Automatically Generated Transactions"

### 3. Concurrent Request Test

Use 2 separate API clients to simultaneously call:
```
POST /orders/{same_order_id}/mark-done
```

**Expected:** 
- Both requests return 200 OK
- Only 1 auto-deduction created (idempotency works)
- No database errors

---

## Performance Testing

### 1. Query Performance

```sql
-- Should return instantly (<100ms)
SELECT * FROM AutoInventoryTransactions WHERE order_id = 'abc-123';

-- Should return in <500ms even with 100k+ records
SELECT * FROM AutoInventoryTransactions 
WHERE DATE(created_at) = CURDATE()
ORDER BY created_at DESC;
```

### 2. Frontend Rendering

- Admin Reports → Inventory tab loads in < 2 seconds
- "Automatically Generated Transactions" table renders smoothly
- Scrolling doesn't lag (table has proper virtualization)

### 3. Order Completion Timing

```javascript
// In logs or monitoring:
// Time from "POST /mark-done" to "200 OK"
// Expected: < 500ms (auto-deduction adds ~50-100ms)
```

---

## Production Readiness Checklist

### Code Quality
- [x] No console errors or warnings
- [x] Proper error handling
- [x] Logging in place
- [x] No hardcoded values (except default unit cost)
- [x] Comments added where needed

### Security
- [x] Input validation (orderId is from database)
- [x] SQL injection prevention (parameterized queries)
- [x] No sensitive data in logs
- [x] Transactions protect data integrity

### Documentation
- [x] Function signatures documented
- [x] Return values documented
- [x] Error scenarios documented
- [x] Testing procedures documented
- [x] Deployment steps documented

### Monitoring
- [x] Error logging in place
- [x] Success logging in place
- [x] Query examples provided
- [x] Metrics collection possible

### Rollback Plan
- [x] Disable steps documented
- [x] Rollback SQL provided
- [x] Zero-downtime possible (just disable feature)

---

## Sign-Off Sheet

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | ☐ |
| QA Tester | | | ☐ |
| Database Admin | | | ☐ |
| DevOps | | | ☐ |
| Product Owner | | | ☐ |

---

## Issues & Resolutions

### Issue: "Pouches inventory item not found"

**Cause:** Migration not executed
**Fix:** 
```bash
cd Backend && node -e "
  const fs = require('fs');
  require('dotenv').config();
  const mysql = require('mysql2/promise');
  
  (async () => {
    const conn = await mysql.createConnection({
      host: process.env.host,
      port: process.env.port,
      user: process.env.user,
      password: process.env.password,
      database: process.env.database
    });
    
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

---

### Issue: "COGS cost center not found"

**Cause:** Migration not executed
**Fix:** Same as above - re-run migration

---

### Issue: "Already deducted" on first completion

**Cause:** Residual test data in AutoInventoryTransactions
**Fix:** Clear test orders:
```sql
DELETE FROM AutoInventoryTransactions 
WHERE order_id IN (SELECT order_id FROM Orders WHERE is_deleted = 1);
```

---

### Issue: Frontend doesn't show auto-generated transactions

**Cause 1:** Component not properly filtering
**Fix:** Verify AdminReports component renders the new section
```javascript
// In browser console:
document.querySelector('[data-testid="auto-deductions"]');  // Should exist
```

**Cause 2:** No transactions exist
**Fix:** Complete an order first

---

## Post-Deployment Monitoring

### Daily Checks

```bash
# Check for auto-deduction errors
grep -i "auto-deduction" logs/backend.log | grep -i "error"

# Count successful deductions
grep -i "auto-deducted.*pouches" logs/backend.log | wc -l

# Verify no duplicate deductions
mysql myjuicedatabase -e "
  SELECT order_id, COUNT(*) as cnt 
  FROM AutoInventoryTransactions 
  GROUP BY order_id HAVING cnt > 1;
"
```

### Weekly Reconciliation

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as deduction_count,
  SUM(pouch_count) as pouches,
  SUM(total_cost) as cogs_amount,
  AVG(unit_cost) as avg_unit_cost
FROM AutoInventoryTransactions
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Monthly Audit

```sql
-- Verify audit trail completeness
SELECT 
  COUNT(*) as total_deductions,
  COUNT(DISTINCT order_id) as unique_orders,
  SUM(total_cost) as total_cogs,
  MIN(created_at) as first_deduction,
  MAX(created_at) as last_deduction
FROM AutoInventoryTransactions
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Check for orphaned transactions
SELECT a.auto_tx_id 
FROM AutoInventoryTransactions a
LEFT JOIN Orders o ON a.order_id = o.order_id
WHERE o.order_id IS NULL;  -- Should be empty
```

---

## Success Criteria

✅ System is working correctly if:

1. **Automation:** Orders automatically create inventory deductions when completed
2. **Accuracy:** COGS amount = pouches × unit_cost
3. **Integrity:** Balance sheet remains balanced after deduction
4. **Idempotency:** Calling mark-done twice creates only 1 deduction
5. **Visibility:** Auto-deductions visible in Admin Reports Inventory tab
6. **Audit Trail:** All auto-generated entries traceable to order ID
7. **Error Handling:** Missing prerequisites don't crash order completion
8. **Performance:** Order completion adds <100ms overhead
9. **Logging:** All operations logged for audit

---

## Next Steps After Deployment

1. **Monitor** for 48 hours (watch logs, balance sheet updates)
2. **Collect Metrics** on deduction frequency, amounts, errors
3. **Gather Feedback** from admin users
4. **Document Procedures** (how to handle exceptions, manual corrections)
5. **Plan Enhancements** (configurable costs, multi-item deductions, etc.)

---

**Deployment Date:** _______________
**Production URL:** _______________
**Support Contact:** _______________
**Rollback Authorization:** _______________
