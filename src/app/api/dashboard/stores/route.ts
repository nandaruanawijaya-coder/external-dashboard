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
    const customStartDate = url.searchParams.get('customStartDate') || undefined;
    const customEndDate = url.searchParams.get('customEndDate') || undefined;
    const { startDate, endDate } = getDateRange(period, customStartDate, customEndDate);

    const bigquery = getBigQueryClient();

    // Get unique stores for this user
    const storesQuery = `
      SELECT DISTINCT
        business_id as id,
        store_name as name
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid_business\`
      WHERE uid = @uid
        AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate
      ORDER BY store_name ASC
    `;

    const [rows] = await bigquery.query({
      query: storesQuery,
      params: { uid, startDate, endDate },
    });

    const stores = rows.map((row: any) => ({
      id: String(row.id),
      name: row.name,
    }));

    return NextResponse.json({ stores });
  } catch (error) {
    console.error('Stores error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}
