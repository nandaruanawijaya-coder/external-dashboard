# STORY 4.2.2 - DATA ACCURACY TESTING
**Date Started:** 2026-08-28  
**Phase:** 4 - QA & Date Range Flexibility  
**Status:** 🔄 IN PROGRESS

---

## Overview

**Objective:** Verify that all data displayed in the dashboard matches source data in BigQuery. Validate calculations, aggregations, row-level access control, and filter accuracy.

**Testing Approach:** 
- Compare dashboard metrics with BigQuery query results
- Verify row-level access control (UID filtering)
- Validate settlement date handling
- Check aggregation calculations
- Test filter accuracy across all dimensions

---

## Test Sections

### Section 1: Scorecard Metrics Validation (5 tests)
- Test 1.1: Total Transactions Count
- Test 1.2: Total Transaction Value
- Test 1.3: Settlement Value Calculation
- Test 1.4: Active Branches Count
- Test 1.5: Metrics for Custom Date Range

**Status:** ⏳ PENDING

### Section 2: Row-Level Access Control (4 tests)
- Test 2.1: UID Filtering in Queries
- Test 2.2: Cross-Store Data Leakage Check
- Test 2.3: Settlement History UID Isolation
- Test 2.4: Multiple UID Scenarios

**Status:** ⏳ PENDING

### Section 3: Settlement Date Handling (4 tests)
- Test 3.1: Settlement Date vs Transaction Date
- Test 3.2: Date Range Filtering Accuracy
- Test 3.3: Timezone Handling (JKT)
- Test 3.4: Settlement Status Accuracy

**Status:** ⏳ PENDING

### Section 4: Filter Accuracy (4 tests)
- Test 4.1: Store Filter Accuracy
- Test 4.2: Status Filter Accuracy
- Test 4.3: Period Filter Accuracy
- Test 4.4: Combined Filters

**Status:** ⏳ PENDING

### Section 5: Aggregation Calculations (3 tests)
- Test 5.1: Sum Calculations
- Test 5.2: Average Calculations
- Test 5.3: Percentage Change Calculations

**Status:** ⏳ PENDING

---

## Summary

| Section | Tests | Status |
|---------|-------|--------|
| Scorecard Metrics | 5 | ⏳ PENDING |
| Row-Level Access | 4 | ⏳ PENDING |
| Settlement Dates | 4 | ⏳ PENDING |
| Filter Accuracy | 4 | ⏳ PENDING |
| Aggregations | 3 | ⏳ PENDING |
| **TOTAL** | **20** | **⏳ PENDING** |

---

## Testing Instructions

### How to Run Validation Tests

#### 1. **Scorecard Metrics Validation**

**Test 1.1: Total Transactions Count**

Dashboard check:
1. Go to dashboard
2. Note the "Total Transactions" value
3. Take screenshot

BigQuery validation:
```sql
SELECT COUNT(*) as total_transactions
FROM `{project}.{dataset}.transactions`
WHERE uid = @uid
  AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate;
```

**Expected:** Dashboard value = BigQuery COUNT result

**Result:** 

---

**Test 1.2: Total Transaction Value**

Dashboard check:
1. Note "Total Value" in Scorecard
2. Take screenshot

BigQuery validation:
```sql
SELECT SUM(amount) as total_value
FROM `{project}.{dataset}.transactions`
WHERE uid = @uid
  AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate;
```

**Expected:** Dashboard value matches SUM(amount)

**Result:** 

---

**Test 1.3: Settlement Value Calculation**

Dashboard check:
1. Note "Settlement Value" in Scorecard
2. Take screenshot

BigQuery validation:
```sql
SELECT SUM(total_amount_settled) as settlement_value
FROM `{project}.{dataset}.daily_settlement_history`
WHERE uid = @uid
  AND DATE(settlement_date) BETWEEN @startDate AND @endDate;
```

**Expected:** Dashboard value matches SUM(total_amount_settled)

**Result:** 

---

**Test 1.4: Active Branches Count**

Dashboard check:
1. Note "Active Branches" value
2. Take screenshot

BigQuery validation:
```sql
SELECT COUNT(DISTINCT business_id) as active_branches
FROM `{project}.{dataset}.transactions`
WHERE uid = @uid
  AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate;
```

**Expected:** Dashboard value = COUNT(DISTINCT business_id)

**Result:** 

---

**Test 1.5: Metrics for Custom Date Range**

Dashboard check:
1. Select custom date range (e.g., 2026-08-01 to 2026-08-15)
2. Note all scorecard metrics
3. Take screenshot

BigQuery validation:
```sql
-- Run all 4 queries above with custom dates
SELECT 
  COUNT(*) as transactions,
  SUM(t.amount) as transaction_value,
  SUM(s.total_amount_settled) as settlement_value,
  COUNT(DISTINCT t.business_id) as branches
FROM `{project}.{dataset}.transactions` t
LEFT JOIN `{project}.{dataset}.daily_settlement_history` s
  ON t.uid = s.uid 
  AND DATE(t.transaction_date_jkt) = DATE(s.settlement_date)
WHERE t.uid = @uid
  AND DATE(t.transaction_date_jkt) BETWEEN '2026-08-01' AND '2026-08-15';
```

**Expected:** All dashboard metrics match query results

**Result:** 

---

#### 2. **Row-Level Access Control**

**Test 2.1: UID Filtering in Queries**

Objective: Verify that API queries filter by UID correctly

Dashboard check:
1. Login with your test account
2. Note your UID from token
3. Check any metric value

API verification:
1. Open DevTools → Network tab
2. Check API request to `/api/dashboard/scorecard`
3. Verify `uid` parameter is included in query
4. Check BigQuery logs that UID filtering is applied

**Expected:** All queries include `WHERE uid = @uid` filter

**Result:** 

---

**Test 2.2: Cross-Store Data Leakage Check**

Objective: Verify data from other UIDs is not visible

Dashboard check:
1. Login with your account
2. Note visible store names and transaction counts

Query verification:
```sql
-- Check if ANY other UIDs' data leaks
SELECT uid, COUNT(*) as transactions
FROM `{project}.{dataset}.transactions`
WHERE DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate
GROUP BY uid;
```

**Expected:** Only your UID appears in results (no data leakage)

**Result:** 

---

**Test 2.3: Settlement History UID Isolation**

Objective: Verify settlement data is properly isolated by UID

BigQuery verification:
```sql
-- Check settlement history is isolated
SELECT uid, COUNT(*) as records
FROM `{project}.{dataset}.daily_settlement_history`
WHERE DATE(settlement_date) BETWEEN @startDate AND @endDate
GROUP BY uid;
```

**Expected:** Only your UID's settlement records returned

**Result:** 

---

**Test 2.4: Multiple UID Scenarios**

Objective: Test with different user accounts

Test steps:
1. Login as User A
2. Note visible data
3. Logout and login as User B
4. Verify User B sees only their own data
5. Verify User A and User B data don't overlap

**Expected:** Each user sees only their own data

**Result:** 

---

#### 3. **Settlement Date Handling**

**Test 3.1: Settlement Date vs Transaction Date**

Objective: Verify correct date fields are used

Dashboard check:
1. Check Settlement History table
2. Note dates displayed

BigQuery verification:
```sql
-- Verify settlement_date is used for settlement queries
SELECT 
  settlement_date,
  transaction_date_jkt,
  COUNT(*) as count
FROM `{project}.{dataset}.daily_settlement_history`
WHERE uid = @uid
  AND DATE(settlement_date) BETWEEN @startDate AND @endDate
GROUP BY settlement_date, transaction_date_jkt
ORDER BY settlement_date DESC
LIMIT 5;
```

**Expected:** Settlement History uses settlement_date, not transaction_date_jkt

**Result:** 

---

**Test 3.2: Date Range Filtering Accuracy**

Objective: Verify date filters are accurate

Dashboard check:
1. Set date range: 2026-08-01 to 2026-08-10
2. Note record count
3. Set date range: 2026-08-11 to 2026-08-20
4. Note new record count
5. Verify ranges are exclusive (no overlap)

BigQuery verification:
```sql
SELECT 
  DATE(settlement_date) as date,
  COUNT(*) as records
FROM `{project}.{dataset}.daily_settlement_history`
WHERE uid = @uid
  AND DATE(settlement_date) BETWEEN '2026-08-01' AND '2026-08-10'
GROUP BY DATE(settlement_date)
ORDER BY date;
```

**Expected:** Dashboard record counts match query results exactly

**Result:** 

---

**Test 3.3: Timezone Handling (JKT)**

Objective: Verify timezone conversion is correct

BigQuery verification:
```sql
-- Check timezone handling
SELECT 
  DATE(transaction_date_jkt) as jkt_date,
  COUNT(*) as transactions,
  SUM(amount) as value
FROM `{project}.{dataset}.transactions`
WHERE uid = @uid
  AND DATE(transaction_date_jkt) = '2026-08-27'
GROUP BY jkt_date;
```

**Expected:** JKT timezone consistently applied (no UTC/JKT mismatches)

**Result:** 

---

**Test 3.4: Settlement Status Accuracy**

Objective: Verify settlement status values are correct

Dashboard check:
1. Filter by status: SUCCESS
2. Filter by status: PENDING
3. Filter by status: FAILED
4. Note record counts for each

BigQuery verification:
```sql
SELECT 
  transaction_status,
  COUNT(*) as records,
  SUM(total_amount_settled) as value
FROM `{project}.{dataset}.daily_settlement_history`
WHERE uid = @uid
  AND DATE(settlement_date) BETWEEN @startDate AND @endDate
GROUP BY transaction_status;
```

**Expected:** Dashboard counts match query results for each status

**Result:** 

---

#### 4. **Filter Accuracy**

**Test 4.1: Store Filter Accuracy**

Objective: Verify store filtering works correctly

Dashboard check:
1. Select a specific store from dropdown
2. Note "Total Transactions" value
3. Take screenshot

BigQuery verification:
```sql
SELECT 
  business_id,
  store_name,
  COUNT(*) as transactions,
  SUM(amount) as value
FROM `{project}.{dataset}.transactions`
WHERE uid = @uid
  AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate
  AND business_id = @selectedStore
GROUP BY business_id, store_name;
```

**Expected:** Dashboard metrics match filtered query results

**Result:** 

---

**Test 4.2: Status Filter Accuracy**

Objective: Verify status filtering works correctly

Dashboard check:
1. Filter by Settlement Status: SUCCESS
2. Note metrics
3. Change to: PENDING
4. Note new metrics
5. Verify metrics changed correctly

BigQuery verification:
```sql
SELECT 
  transaction_status,
  COUNT(*) as records,
  SUM(total_amount_settled) as value
FROM `{project}.{dataset}.daily_settlement_history`
WHERE uid = @uid
  AND DATE(settlement_date) BETWEEN @startDate AND @endDate
  AND transaction_status = @status
GROUP BY transaction_status;
```

**Expected:** Dashboard metrics match filtered results for each status

**Result:** 

---

**Test 4.3: Period Filter Accuracy**

Objective: Verify period selector works correctly

Dashboard check:
1. Select MTD → Note metrics
2. Select QTD → Note metrics
3. Select YTD → Note metrics
4. Select 90D → Note metrics
5. Verify each period shows different data

BigQuery verification:
```sql
-- For each period, verify dashboard matches:
-- MTD: This month
-- QTD: This quarter
-- YTD: This year
-- 90D: Last 90 days

SELECT 
  CURRENT_DATE() as today,
  EXTRACT(DAY FROM CURRENT_DATE()) as day_of_month,
  COUNT(*) as records
FROM `{project}.{dataset}.transactions`
WHERE uid = @uid
  AND DATE(transaction_date_jkt) BETWEEN 
    DATE_TRUNC(CURRENT_DATE(), MONTH) AND CURRENT_DATE();
```

**Expected:** Dashboard period metrics match calculated date ranges

**Result:** 

---

**Test 4.4: Combined Filters**

Objective: Verify multiple filters work together correctly

Dashboard check:
1. Set: MTD + Store ABC + Status SUCCESS
2. Note metrics
3. Verify results include only:
   - This month's data
   - Store ABC only
   - SUCCESS status only

BigQuery verification:
```sql
SELECT COUNT(*) as records
FROM `{project}.{dataset}.daily_settlement_history`
WHERE uid = @uid
  AND DATE(settlement_date) BETWEEN 
    DATE_TRUNC(CURRENT_DATE(), MONTH) AND CURRENT_DATE()
  AND business_id = 'ABC'
  AND transaction_status = 'SUCCESS';
```

**Expected:** Dashboard count matches combined filter query

**Result:** 

---

#### 5. **Aggregation Calculations**

**Test 5.1: Sum Calculations**

Objective: Verify all sum calculations are correct

Dashboard check:
1. Note "Total Value" in Scorecard
2. Take screenshot

BigQuery verification:
```sql
SELECT 
  SUM(amount) as total,
  COUNT(*) as count,
  AVG(amount) as avg
FROM `{project}.{dataset}.transactions`
WHERE uid = @uid
  AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate;
```

**Expected:** Dashboard Total Value = BigQuery SUM(amount)

**Result:** 

---

**Test 5.2: Average Calculations**

Objective: Verify average calculations

BigQuery verification:
```sql
SELECT 
  AVG(amount) as avg_transaction,
  AVG(transaction_count) as avg_daily_transactions
FROM `{project}.{dataset}.transactions`;
```

**Expected:** Any dashboard averages match calculated values

**Result:** 

---

**Test 5.3: Percentage Change Calculations**

Objective: Verify % change is calculated correctly

Dashboard check:
1. Note % change value for a metric
2. Take screenshot

BigQuery verification:
```sql
-- Compare this month vs last month
SELECT 
  this_month,
  last_month,
  ROUND((this_month - last_month) / last_month * 100, 1) as pct_change
FROM (
  SELECT 
    SUM(CASE WHEN DATE_TRUNC(transaction_date_jkt, MONTH) = 
      DATE_TRUNC(CURRENT_DATE(), MONTH) THEN amount ELSE 0 END) as this_month,
    SUM(CASE WHEN DATE_TRUNC(transaction_date_jkt, MONTH) = 
      DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH) THEN amount ELSE 0 END) as last_month
  FROM `{project}.{dataset}.transactions`
  WHERE uid = @uid
);
```

**Expected:** Dashboard % change = Calculated percentage

**Result:** 

---

## Sign-Off

⏳ **Story 4.2.2 In Progress - Testing Started 2026-08-28**

Once all 20 tests complete, this story will be signed off.
