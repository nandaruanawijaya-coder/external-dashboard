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
    let sort = (url.searchParams.get('sort') as any) || 'transactions_desc';
    const customStartDate = url.searchParams.get('customStartDate') || undefined;
    const customEndDate = url.searchParams.get('customEndDate') || undefined;

    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period, customStartDate, customEndDate);

    const bigquery = getBigQueryClient();

    // Build store filter condition
    const storeFilter = store ? 'AND business_id = @store' : '';
    const storeParam = store ? { store: store } : {};

    // Current period by store
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

    // Get previous period data for each store
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

    const toNumber = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val);
      if (val.toString) return parseFloat(val.toString());
      return 0;
    };

    // Combine data with changes
    const allStores = currentRows.map((row: any) => {
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

    // Sort based on sort parameter
    const sortByField = (stores: any[], sortParam: string) => {
      // Split from the end to handle multi-underscore fields like settlement_value
      const lastUnderscoreIndex = sortParam.lastIndexOf('_');
      const field = sortParam.substring(0, lastUnderscoreIndex);
      const direction = sortParam.substring(lastUnderscoreIndex + 1);
      const isDescending = direction === 'desc';

      return [...stores].sort((a, b) => {
        let aVal = 0;
        let bVal = 0;

        switch (field) {
          case 'transactions':
            aVal = a.total_transactions;
            bVal = b.total_transactions;
            break;
          case 'value':
            aVal = a.total_value;
            bVal = b.total_value;
            break;
          case 'settlement_days':
            aVal = a.settlement_days;
            bVal = b.settlement_days;
            break;
          case 'settlement_value':
            aVal = a.settlement_value;
            bVal = b.settlement_value;
            break;
          default:
            aVal = a.total_transactions;
            bVal = b.total_transactions;
        }

        return isDescending ? bVal - aVal : aVal - bVal;
      });
    };

    const sortedStores = sortByField(allStores, sort);

    return NextResponse.json({
      stores: sortedStores,
      sort,
    });
  } catch (error) {
    console.error('All stores error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch all stores' },
      { status: 500 }
    );
  }
}
