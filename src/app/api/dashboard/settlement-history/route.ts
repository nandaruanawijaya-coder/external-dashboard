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
    const status = (url.searchParams.get('status') as any) || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;
    const customStartDate = url.searchParams.get('customStartDate') || undefined;
    const customEndDate = url.searchParams.get('customEndDate') || undefined;

    const { startDate, endDate } = getDateRange(period, customStartDate, customEndDate);

    const bigquery = getBigQueryClient();

    // Build filter conditions
    const storeFilter = store ? 'AND business_id = @store' : '';
    const statusFilter = status ? 'AND transaction_status = @status' : '';
    const params: any = { uid, startDate, endDate, limit, offset };
    if (store) params.store = store;
    if (status) params.status = status;

    const query = `
      SELECT
        settlement_date,
        business_id,
        store_name,
        total_amount_settled as settlement_amount,
        transaction_count,
        transaction_status as settlement_status
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_settlement_history\`
      WHERE uid = @uid
        AND DATE(settlement_date) BETWEEN @startDate AND @endDate
        ${storeFilter}
        ${statusFilter}
      ORDER BY settlement_date DESC, business_id ASC
      LIMIT @limit OFFSET @offset
    `;

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_settlement_history\`
      WHERE uid = @uid
        AND DATE(settlement_date) BETWEEN @startDate AND @endDate
        ${storeFilter}
        ${statusFilter}
    `;

    const [countRows] = await bigquery.query({
      query: countQuery,
      params,
    });

    const [rows] = await bigquery.query({
      query,
      params,
    });

    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

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

    return NextResponse.json({
      settlements: rows.map((row: any) => ({
        settlement_date: formatDate(row.settlement_date),
        business_id: row.business_id,
        store_name: row.store_name,
        settlement_amount: toNumber(row.settlement_amount),
        transaction_count: toNumber(row.transaction_count),
        settlement_status: row.settlement_status || 'PENDING',
      })),
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('Settlement history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settlement history' },
      { status: 500 }
    );
  }
}
