import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDateRange } from '@/lib/dateUtils';
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
    const customStartDate = url.searchParams.get('customStartDate') || undefined;
    const customEndDate = url.searchParams.get('customEndDate') || undefined;
    const { startDate, endDate } = getDateRange(period, customStartDate, customEndDate);

    const bigquery = getBigQueryClient();

    // Build store filter condition
    const storeFilter = store ? 'AND business_id = @store' : '';
    const storeParam = store ? { store: store } : {};

    // Transactions by day of week
    const query = `
      SELECT
        CASE CAST(FORMAT_DATE('%w', DATE(transaction_date_jkt)) AS INT64)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_name,
        CAST(FORMAT_DATE('%w', DATE(transaction_date_jkt)) AS INT64) as day_order,
        SUM(total_transactions) as transactions,
        SUM(total_value) as value
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid_business\`
      WHERE uid = @uid
        AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate
        ${storeFilter}
      GROUP BY day_name, day_order
      ORDER BY day_order ASC
    `;

    const [rows] = await bigquery.query({
      query,
      params: { uid, startDate, endDate, ...storeParam },
    });

    const toNumber = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val);
      if (val.toString) return parseFloat(val.toString());
      return 0;
    };

    const data = rows.map((row: any) => ({
      day: row.day_name,
      transactions: toNumber(row.transactions),
      value: toNumber(row.value),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Day of week error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch day of week data' },
      { status: 500 }
    );
  }
}
