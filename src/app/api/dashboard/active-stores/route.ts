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
    const viewMode = (url.searchParams.get('mode') as 'daily' | 'monthly') || 'daily';
    const customStartDate = url.searchParams.get('customStartDate') || undefined;
    const customEndDate = url.searchParams.get('customEndDate') || undefined;
    const { startDate, endDate } = getDateRange(period, customStartDate, customEndDate);

    const bigquery = getBigQueryClient();

    // Define queries
    const monthlyQuery = `
      SELECT
        DATE_TRUNC(DATE(settlement_date), MONTH) as month,
        COUNT(DISTINCT business_id) as active_stores
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid_business\`
      WHERE uid = @uid
        AND DATE(settlement_date) BETWEEN @startDate AND @endDate
      GROUP BY DATE_TRUNC(DATE(settlement_date), MONTH)
      ORDER BY month ASC
    `;

    const dailyQuery = `
      SELECT
        DATE(settlement_date) as date,
        COUNT(DISTINCT business_id) as active_stores
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid_business\`
      WHERE uid = @uid
        AND DATE(settlement_date) BETWEEN @startDate AND @endDate
      GROUP BY DATE(settlement_date)
      ORDER BY date ASC
    `;

    const totalStoresQuery = `
      SELECT
        COUNT(DISTINCT business_id) as total_stores
      FROM \`ledger-fcc1e.key_account_reports.retail_order_transaction_summary\`
      WHERE phone_number = @uid
    `;

    // Run queries in parallel
    const results = await Promise.all([
      bigquery.query({
        query: viewMode === 'monthly' ? monthlyQuery : dailyQuery,
        params: { uid, startDate, endDate },
      }),
      bigquery.query({
        query: totalStoresQuery,
        params: { uid },
      }),
    ]);

    const [activeRows] = results[0];
    const [totalStoresRowsData] = results[1];
    const totalStoresRows = totalStoresRowsData;

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

    const totalStores = toNumber(totalStoresRows[0]?.total_stores);

    return NextResponse.json({
      total_stores: totalStores,
      data: activeRows.map((row: any) => ({
        date: formatDate(viewMode === 'monthly' ? row.month : row.date),
        active_stores: toNumber(row.active_stores),
      })),
    });
  } catch (error) {
    console.error('Active stores error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active stores' },
      { status: 500 }
    );
  }
}
