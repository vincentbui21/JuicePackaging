# Historical Data System - Deployment Checklist

## Pre-Deployment Verification

### Database
- [ ] Execute migration: `Database/add_historical_snapshots.sql`
- [ ] Verify 5 new tables created:
  ```sql
  SHOW TABLES LIKE 'Report%';     -- Should show ReportSnapshots
  SHOW TABLES LIKE 'Archived%';   -- Should show ArchivedOrders, ArchivedCostEntries
  SHOW TABLES LIKE 'Historical%'; -- Should show HistoricalPeriods
  ```
- [ ] Verify indices created: `SHOW INDEXES FROM ReportSnapshots;`
- [ ] Check ReportExports table: `DESC ReportExports;`

### Backend
- [ ] Verify new functions exported in `database_fns.js`:
  - `createReportSnapshot`
  - `getReportSnapshot`
  - `listReportSnapshots`
  - `archiveSeasonData`
  - `getHistoricalReport`
  - `compareSeasons`
  - `recordReportExport`
- [ ] Verify new API endpoints in `server.js`:
  - POST `/archive-season`
  - GET `/historical-periods`
  - GET `/historical-report/:seasonName`
  - GET `/report-comparison/:season1/:season2`
  - POST `/create-snapshot`
  - POST `/record-export`
- [ ] No syntax errors: `node Backend/server.js` (should show "server listening at 5001")
- [ ] Test endpoints with curl or Postman

### Frontend
- [ ] Verify state variables added to `AdminReports.jsx`:
  - `reportMode`
  - `historicalPeriods`
  - `selectedPeriod`
  - `historicalData`
  - `comparePeriod1`, `comparePeriod2`
  - `comparisonResult`
- [ ] Verify functions added:
  - `loadHistoricalPeriods()`
  - `loadHistoricalReport(seasonName)`
  - `compareSeasonReports(s1, s2)`
- [ ] UI Elements present:
  - Historical Data & Analysis card
  - Report Mode selector dropdown
  - Period selector dropdown
  - Comparison controls and results display
- [ ] No console errors: Open browser DevTools

## Deployment Steps

### 1. Execute Database Migration
```bash
# From project root
mysql --user=admin --password='M!hustaja-Savonia' \
  --host=myjuicepackagingdatabase.cj2ka46iwypj.eu-central-1.rds.amazonaws.com \
  myjuicedatabase < Database/add_historical_snapshots.sql

# If using Docker:
# docker compose exec database mysql -umehustaja -pmehustaja mehustaja < Database/add_historical_snapshots.sql
```

### 2. Restart Backend
```bash
# Terminal 1: Stop current backend
# Press Ctrl+C in backend terminal

# Restart
cd Backend
npm start
# Should show: "server is listening at port 5001!!"
```

### 3. Verify Backend Endpoints
```bash
# Test /historical-periods endpoint
curl http://localhost:5001/historical-periods

# Should return: { "success": true, "periods": [] }
# (Empty array until first season archived)
```

### 4. Reload Frontend
```bash
# In browser with Frontend running
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
# Or stop Frontend and `npm run dev`
```

### 5. Smoke Test
- [ ] Navigate to Admin Reports
- [ ] Verify "Historical Data & Analysis" card appears
- [ ] Verify "Report Mode" dropdown shows 3 options:
  - Current Season
  - Previous Seasons
  - Compare Seasons
- [ ] Select "Previous Seasons" → should show "No historical data available"
- [ ] No console errors in DevTools

## Functional Testing

### Test 1: Current Season Mode (Default)
```
1. Open Admin Reports
2. Verify "Report Mode" is set to "Current Season"
3. Select date range (e.g., "This month")
4. Verify data loads normally
5. All tabs (Overview, Costs, Inventory, etc.) work
```

### Test 2: Historical Mode (No Data Yet)
```
1. Open Admin Reports
2. Change "Report Mode" to "Previous Seasons"
3. Verify message: "No historical data available"
4. This is expected - no seasons archived yet
```

### Test 3: Archive a Season
```bash
# Archive test season
curl -X POST http://localhost:5001/archive-season \
  -H "Content-Type: application/json" \
  -d '{
    "seasonName": "Test Season 2024",
    "periodStart": "2024-01-01",
    "periodEnd": "2024-12-31"
  }'

# Expected Response:
# {
#   "success": true,
#   "seasonName": "Test Season 2024",
#   "ordersArchived": X,
#   "costsArchived": Y,
#   "message": "..."
# }
```

### Test 4: View Historical Report
```bash
# Retrieve archived data
curl http://localhost:5001/historical-report/Test%20Season%202024

# Expected Response:
# {
#   "success": true,
#   "seasonName": "Test Season 2024",
#   "period": {...},
#   "totals": {...},
#   "orders": [...],
#   "costs": [...]
# }
```

### Test 5: Historical Mode UI
```
1. Open Admin Reports
2. Change "Report Mode" to "Previous Seasons"
3. Verify dropdown now shows "Test Season 2024"
4. Select it
5. Verify alert shows: "Viewing historical data for Test Season 2024: X orders, €Y"
```

### Test 6: Compare Seasons
```
1. Archive a second test season (or use existing)
2. Change "Report Mode" to "Compare Seasons"
3. Select Season 1 and Season 2 from dropdowns
4. Click "Compare"
5. Verify comparison results card appears with metrics:
   - Orders comparison with % change
   - Kilos comparison with % change
   - Pouches comparison with % change
   - Revenue comparison with % change
```

### Test 7: Export Recording
```bash
# Record an export for audit trail
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

# Verify in database:
# SELECT * FROM ReportExports ORDER BY exported_at DESC LIMIT 1;
```

## Performance Testing

### Expected Query Performance
- `getHistoricalReport()`: < 100ms (denormalized data)
- `compareSeasons()`: < 200ms (two archive queries)
- `/historical-periods`: < 50ms (list snapshots)

### Load Testing
- Archive 10 test seasons
- Verify frontend dropdown still responsive
- Compare 2 large seasons simultaneously
- Expected: No performance degradation

## Rollback Plan

If issues arise, rollback is simple:

### Option 1: Drop Archive Tables (Loses historical data)
```sql
DROP TABLE ReportExports;
DROP TABLE HistoricalPeriods;
DROP TABLE ArchivedCostEntries;
DROP TABLE ArchivedOrders;
DROP TABLE ReportSnapshots;

-- Remove season column from Orders/Customers if needed
-- ALTER TABLE Orders DROP COLUMN season;
-- ALTER TABLE Customers DROP COLUMN season;
```

### Option 2: Disable in Frontend (Keep data)
1. Remove Historical Data card from AdminReports.jsx
2. Set `reportMode` to always be "current"
3. Data preserved in archive tables if needed later

### Option 3: Disable API Endpoints (Keep backend)
1. Comment out `/archive-season`, `/historical-*`, `/compare-*` routes in server.js
2. Keep database tables and functions intact
3. Re-enable later without data loss

## Post-Deployment Monitoring

### Check Logs
```bash
# Backend logs (look for archive operations)
# Tail: npm start output

# Frontend errors
# Browser DevTools → Console tab

# Database slow queries
# Enable slow query log on RDS
```

### Monitor Usage
```sql
-- Check archive table sizes
SELECT 
  'ReportSnapshots' AS table_name, COUNT(*) AS records 
FROM ReportSnapshots
UNION ALL
SELECT 'ArchivedOrders', COUNT(*) FROM ArchivedOrders
UNION ALL
SELECT 'ArchivedCostEntries', COUNT(*) FROM ArchivedCostEntries
UNION ALL
SELECT 'HistoricalPeriods', COUNT(*) FROM HistoricalPeriods
UNION ALL
SELECT 'ReportExports', COUNT(*) FROM ReportExports;

-- Check export audit trail
SELECT 
  exported_by, 
  COUNT(*) as exports, 
  MAX(exported_at) as last_export
FROM ReportExports
GROUP BY exported_by;
```

## Known Limitations & Workarounds

### Limitation 1: No Auto-Archival (First Release)
**Workaround:** Call `/archive-season` manually at season end via cron job or scheduler
```bash
# Cron job example (runs Jan 1 each year at 2 AM)
0 2 1 1 * curl -X POST http://localhost:5001/archive-season \
  -d '{"seasonName":"Season 2025","periodStart":"2025-01-01","periodEnd":"2025-12-31"}'
```

### Limitation 2: No Automatic Snapshot Creation
**Workaround:** Create snapshots manually via API when needed
```bash
curl -X POST http://localhost:5001/create-snapshot \
  -H "Content-Type: application/json" \
  -d '{"snapshotName":"Q4 Checkpoint","reportData":{...}}'
```

### Limitation 3: No Export to PDF/Excel (MVP)
**Workaround:** Export as CSV, open in Excel/Google Sheets
- CSV contains all order and cost data
- Users can create Excel reports manually
- PDF export planned for v2

### Limitation 4: Customer Name Only at Archive Time
**Workaround:** Archive BEFORE deleting customers
- Names frozen at archive time
- Use previous season archives for historical names
- Document customer deletions separately if needed

## Documentation

- [ ] User guide created: `HISTORICAL_DATA_SYSTEM.md`
- [ ] API documentation complete with examples
- [ ] Database schema documented with indices
- [ ] Workflow diagram created for training

## Sign-Off

- [ ] All tests passed
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Database migration verified
- [ ] Team trained on usage
- [ ] Backup taken before deployment
- [ ] Go-live approved

**Deployed by:** _________________  
**Date:** _________________  
**Time:** _________________  

## Support Contacts

**Backend Issues:**
- Check server.js logs
- Verify endpoints accessible: `curl http://localhost:5001/historical-periods`
- Check database connection in .env

**Frontend Issues:**
- Check browser console (F12)
- Verify API URLs in axios client
- Clear cache and reload

**Database Issues:**
- Verify RDS connection credentials
- Check security groups for port 3306
- Run migration again if tables missing

---

**Last Updated:** Jan 3, 2026  
**Version:** 1.0 (Initial Release)
