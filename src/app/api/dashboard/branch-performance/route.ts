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
    const store = (url.searchParams.get('store') as any) || '';
    let metric = (url.searchParams.get('metric') as any) || 'total_transactions';
    const customStartDate = url.searchParams.get('customStartDate') || undefined;
    const customEndDate = url.searchParams.get('customEndDate') || undefined;

    // Map metric names to field names
    const metricMap: Record<string, string> = {
      'transactions': 'total_transactions',
      'transaction_value': 'total_value',
      'settlement_value': 'settlement_value',
      'settlement_days': 'settlement_days',
    };

    metric = metricMap[metric] || metric;
    console.log('Branch performance - metric:', metric, 'period:', period, 'store:', store);

    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period, customStartDate, customEndDate);

    // Build store filter condition
    const storeFilter = store ? 'AND business_id = @store' : '';
    const storeParam = store ? { store: store } : {};

    const bigquery = getBigQueryClient();

    // Current period by store - use retail_order_transaction_summary with separate date filters
    const currentQuery = `
      SELECT
        business_id,
        store_name,
        COUNT(DISTINCT CASE WHEN DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate AND transaction_status = 'SUCCESS' THEN transaction_id END) as total_transactions,
        SUM(CASE WHEN DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate AND transaction_status = 'SUCCESS' THEN settlement_amount ELSE 0 END) as total_value,
        COUNT(DISTINCT CASE WHEN DATE(settlement_date) BETWEEN @startDate AND @endDate AND transaction_status = 'SUCCESS' THEN CONCAT(business_id, '_', settlement_date) END) as settlement_days,
        CASE
          WHEN MAX(CASE WHEN DATE(settlement_date) BETWEEN @startDate AND @endDate AND transaction_status = 'SUCCESS' THEN Is_Manual_Invoice END) = 0
            THEN SUM(CASE WHEN DATE(settlement_date) BETWEEN @startDate AND @endDate AND transaction_category = 'SUBSCRIPTION_FEE' AND transaction_status = 'SUCCESS' THEN ABS(settlement_amount) END)
          WHEN MAX(CASE WHEN DATE(settlement_date) BETWEEN @startDate AND @endDate AND transaction_status = 'SUCCESS' THEN Is_Manual_Invoice END) = 1
            THEN COUNT(DISTINCT CASE WHEN DATE(settlement_date) BETWEEN @startDate AND @endDate AND transaction_category = 'INCOME' AND transaction_status = 'SUCCESS' THEN CONCAT(business_id, '_', settlement_date) END) * 1500
          ELSE SUM(CASE WHEN DATE(settlement_date) BETWEEN @startDate AND @endDate AND transaction_status = 'SUCCESS' THEN settlement_amount END)
        END as settlement_value
      FROM \`ledger-fcc1e.key_account_reports.retail_order_transaction_summary\`
      WHERE phone_number = @uid
        AND transaction_status = 'SUCCESS'
        ${storeFilter}
      GROUP BY business_id, store_name
    `;

    const [currentRows] = await bigquery.query({
      query: currentQuery,
      params: { uid, startDate, endDate, ...storeParam },
    });

    console.log('Branch performance currentRows:', currentRows.length, 'uid:', uid, 'startDate:', startDate, 'endDate:', endDate);

    // Get previous period data for each store - use same logic as current period
    const prevQuery = `
      SELECT
        business_id,
        COUNT(DISTINCT CASE WHEN DATE(transaction_date_jkt) BETWEEN @prevStartDate AND @prevEndDate AND transaction_status = 'SUCCESS' THEN transaction_id END) as total_transactions,
        SUM(CASE WHEN DATE(transaction_date_jkt) BETWEEN @prevStartDate AND @prevEndDate AND transaction_status = 'SUCCESS' THEN settlement_amount ELSE 0 END) as total_value,
        COUNT(DISTINCT CASE WHEN DATE(settlement_date) BETWEEN @prevStartDate AND @prevEndDate AND transaction_status = 'SUCCESS' THEN CONCAT(business_id, '_', settlement_date) END) as settlement_days,
        CASE
          WHEN MAX(CASE WHEN DATE(settlement_date) BETWEEN @prevStartDate AND @prevEndDate AND transaction_status = 'SUCCESS' THEN Is_Manual_Invoice END) = 0
            THEN SUM(CASE WHEN DATE(settlement_date) BETWEEN @prevStartDate AND @prevEndDate AND transaction_category = 'SUBSCRIPTION_FEE' AND transaction_status = 'SUCCESS' THEN ABS(settlement_amount) END)
          WHEN MAX(CASE WHEN DATE(settlement_date) BETWEEN @prevStartDate AND @prevEndDate AND transaction_status = 'SUCCESS' THEN Is_Manual_Invoice END) = 1
            THEN COUNT(DISTINCT CASE WHEN DATE(settlement_date) BETWEEN @prevStartDate AND @prevEndDate AND transaction_category = 'INCOME' AND transaction_status = 'SUCCESS' THEN CONCAT(business_id, '_', settlement_date) END) * 1500
          ELSE SUM(CASE WHEN DATE(settlement_date) BETWEEN @prevStartDate AND @prevEndDate AND transaction_status = 'SUCCESS' THEN settlement_amount END)
        END as settlement_value
      FROM \`ledger-fcc1e.key_account_reports.retail_order_transaction_summary\`
      WHERE phone_number = @uid
        AND transaction_status = 'SUCCESS'
        ${storeFilter}
      GROUP BY business_id
    `;

    const [prevRows] = await bigquery.query({
      query: prevQuery,
      params: { uid, prevStartDate, prevEndDate, ...storeParam },
    });

    // Map previous data by business_id
    const prevDataMap = new Map(
      prevRows.map((row: any) => [String(row.business_id), row])
    );


    const formatDate = (date: any): string => {
      if (typeof date === 'string') return date;
      if (date instanceof Date) return date.toISOString().split('T')[0];
      if (date && typeof date === 'object' && date.value) return date.value;
      return String(date);
    };

    const toNumber = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val);
      if (val.toString) return parseFloat(val.toString());
      return 0;
    };

    // Combine data with changes
    const allBranches = currentRows.map((row: any) => {
      const prevData = prevDataMap.get(String(row.business_id)) || {};
      return {
        business_id: row.business_id,
        store_name: row.store_name,
        total_transactions: toNumber(row.total_transactions),
        total_transactions_change: calculateChange(
          toNumber(row.total_transactions),
          toNumber(prevData.total_transactions)
        ),
        total_value: toNumber(row.total_value),
        total_value_change: calculateChange(
          toNumber(row.total_value),
          toNumber(prevData.total_value)
        ),
        settlement_days: toNumber(row.settlement_days),
        settlement_days_change: calculateChange(
          toNumber(row.settlement_days),
          toNumber(prevData.settlement_days)
        ),
        settlement_value: toNumber(row.settlement_value),
        settlement_value_change: calculateChange(
          toNumber(row.settlement_value),
          toNumber(prevData.settlement_value)
        ),
      };
    });

    // Sort by selected metric
    const sortByMetric = (branches: any[], metricName: string, descending: boolean) => {
      return [...branches].sort((a, b) => {
        const aVal = a[metricName] || 0;
        const bVal = b[metricName] || 0;
        return descending ? bVal - aVal : aVal - bVal;
      });
    };

    // Get top 10 by selected metric
    const top10 = sortByMetric(allBranches, metric, true).slice(0, 10);
    const top10Ids = new Set(top10.map(b => b.business_id));

    // Get bottom 10 by selected metric (only stores with transactions > 0 and not in top 10)
    const activeBranches = allBranches.filter(b => b.total_transactions > 0 && !top10Ids.has(b.business_id));
    const bottom10 = sortByMetric(activeBranches, metric, false).slice(0, 10);

    console.log('Returning top10:', top10.length, 'bottom10:', bottom10.length);
    return NextResponse.json({
      top10,
      bottom10,
      metric,
    });
  } catch (error) {
    console.error('Branch performance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branch performance' },
      { status: 500 }
    );
  }
}
