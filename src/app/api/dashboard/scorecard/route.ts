import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDateRange, calculateChange } from '@/lib/dateUtils';
import { getBigQueryClient } from '@/lib/bigquery';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const uid = payload.uid;
    const url = new URL(request.url);
    const period = (url.searchParams.get('period') as any) || 'mtd';
    const customStartDate = url.searchParams.get('customStartDate') || undefined;
    const customEndDate = url.searchParams.get('customEndDate') || undefined;
    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period, customStartDate, customEndDate);


    const bigquery = getBigQueryClient();

    // Current period metrics - transactions by transaction_date_jkt
    const currentQuery = `
      SELECT
        SUM(total_transactions) as total_transactions,
        SUM(total_value) as total_value
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid\`
      WHERE uid = @uid
        AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate
    `;

    const [currentRows] = await bigquery.query({
      query: currentQuery,
      params: { uid, startDate, endDate },
    });

    // Previous period metrics - transactions by transaction_date_jkt
    const prevQuery = `
      SELECT
        SUM(total_transactions) as total_transactions,
        SUM(total_value) as total_value
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid\`
      WHERE uid = @uid
        AND DATE(transaction_date_jkt) BETWEEN @prevStartDate AND @prevEndDate
    `;

    // Settlement value by settlement_date
    const currentSettlementQuery = `
      SELECT
        SUM(total_settlement_value) as total_settlement_value
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid\`
      WHERE uid = @uid
        AND DATE(settlement_date) BETWEEN @startDate AND @endDate
    `;

    const prevSettlementQuery = `
      SELECT
        SUM(total_settlement_value) as total_settlement_value
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid\`
      WHERE uid = @uid
        AND DATE(settlement_date) BETWEEN @prevStartDate AND @prevEndDate
    `;

    // Total settlement count - count distinct (business_id, settlement_date) pairs
    const currentTotalSettlementQuery = `
      SELECT
        COUNT(DISTINCT CONCAT(CAST(business_id AS STRING), '|', CAST(DATE(settlement_date) AS STRING))) as total_settlement_count
      FROM \`ledger-fcc1e.key_account_reports.retail_order_transaction_summary\`
      WHERE phone_number = @uid
        AND DATE(settlement_date) BETWEEN @startDate AND @endDate
        AND LOWER(transaction_category) = 'income'
        AND LOWER(transaction_status) = 'success'
    `;

    const prevTotalSettlementQuery = `
      SELECT
        COUNT(DISTINCT CONCAT(CAST(business_id AS STRING), '|', CAST(DATE(settlement_date) AS STRING))) as total_settlement_count
      FROM \`ledger-fcc1e.key_account_reports.retail_order_transaction_summary\`
      WHERE phone_number = @uid
        AND DATE(settlement_date) BETWEEN @prevStartDate AND @prevEndDate
        AND LOWER(transaction_category) = 'income'
        AND LOWER(transaction_status) = 'success'
    `;

    // Total branches in current period
    const totalBranchesQuery = `
      SELECT
        COUNT(DISTINCT business_id) as total_branches
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid_business\`
      WHERE uid = @uid
        AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate
    `;

    // Active branches in current period (stores with settlement)
    const activeBranchesQuery = `
      SELECT
        COUNT(DISTINCT business_id) as active_branches
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid_business\`
      WHERE uid = @uid
        AND DATE(settlement_date) BETWEEN @startDate AND @endDate
        AND total_transactions > 0
    `;

    // Total stores from all time
    const allTimeStoresQuery = `
      SELECT
        COUNT(DISTINCT business_id) as total_stores
      FROM \`ledger-fcc1e.key_account_reports.retail_order_transaction_summary\`
      WHERE phone_number = @uid
    `;

    // Run all queries in parallel instead of sequentially
    const results = await Promise.all([
      bigquery.query({
        query: prevQuery,
        params: { uid, prevStartDate, prevEndDate },
      }),
      bigquery.query({
        query: currentSettlementQuery,
        params: { uid, startDate, endDate },
      }),
      bigquery.query({
        query: prevSettlementQuery,
        params: { uid, prevStartDate, prevEndDate },
      }),
      bigquery.query({
        query: totalBranchesQuery,
        params: { uid, startDate, endDate },
      }),
      bigquery.query({
        query: activeBranchesQuery,
        params: { uid, startDate, endDate },
      }),
      bigquery.query({
        query: allTimeStoresQuery,
        params: { uid },
      }),
      bigquery.query({
        query: currentTotalSettlementQuery,
        params: { uid, startDate, endDate },
      }),
      bigquery.query({
        query: prevTotalSettlementQuery,
        params: { uid, prevStartDate, prevEndDate },
      }),
    ]);

    const [prevRows] = results[0];
    const [currentSettlementRows] = results[1];
    const [prevSettlementRows] = results[2];
    const [totalBranchesRows] = results[3];
    const [activeBranchesRows] = results[4];
    const [allTimeStoresRows] = results[5];
    const [currentTotalSettlementRows] = results[6];
    const [prevTotalSettlementRows] = results[7];

    const currentData = currentRows[0] || {};
    const prevData = prevRows[0] || {};
    const currentSettlementData = currentSettlementRows[0] || {};
    const prevSettlementData = prevSettlementRows[0] || {};
    const totalBranchesData = totalBranchesRows[0] || {};
    const activeBranchesData = activeBranchesRows[0] || {};
    const allTimeStoresData = allTimeStoresRows[0] || {};
    const currentTotalSettlementData = currentTotalSettlementRows[0] || {};
    const prevTotalSettlementData = prevTotalSettlementRows[0] || {};

    const toNumber = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      }
      if (val.toString) {
        const str = val.toString();
        const parsed = parseFloat(str);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const total_value_num = toNumber(currentData.total_value);

    return NextResponse.json({
      total_transactions: toNumber(currentData.total_transactions),
      total_transactions_change: calculateChange(
        toNumber(currentData.total_transactions),
        toNumber(prevData.total_transactions)
      ),
      total_value: total_value_num,
      total_value_change: calculateChange(
        total_value_num,
        toNumber(prevData.total_value)
      ),
      active_branches: toNumber(activeBranchesData.active_branches),
      total_stores: toNumber(allTimeStoresData.total_stores),
      active_branches_percentage: (
        toNumber(activeBranchesData.active_branches) / toNumber(allTimeStoresData.total_stores) * 100
      ) || 0,
      total_settlement_value: toNumber(currentSettlementData.total_settlement_value),
      total_settlement_value_change: calculateChange(
        toNumber(currentSettlementData.total_settlement_value),
        toNumber(prevSettlementData.total_settlement_value)
      ),
      total_settlement: toNumber(currentTotalSettlementData.total_settlement_count),
      total_settlement_change: calculateChange(
        toNumber(currentTotalSettlementData.total_settlement_count),
        toNumber(prevTotalSettlementData.total_settlement_count)
      ),
    });
  } catch (error) {
    console.error('Scorecard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scorecard' },
      { status: 500 }
    );
  }
}
