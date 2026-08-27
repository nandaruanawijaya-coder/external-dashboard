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

    // Daily trends - transactions by transaction_date_jkt
    const dailyQuery = `
      SELECT
        DATE(transaction_date_jkt) as date,
        SUM(total_transactions) as transactions,
        SUM(total_value) as value
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid_business\`
      WHERE uid = @uid
        AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate
        ${storeFilter}
      GROUP BY DATE(transaction_date_jkt)
      ORDER BY date ASC
    `;

    const [dailyRows] = await bigquery.query({
      query: dailyQuery,
      params: { uid, startDate, endDate, ...storeParam },
    });

    // Daily settlement trends - settlements and settlement value by settlement_date
    const dailySettlementQuery = `
      SELECT
        DATE(settlement_date) as date,
        COUNT(DISTINCT CONCAT(CAST(business_id AS STRING), CAST(DATE(settlement_date) AS STRING))) as settlement_days,
        CASE
          WHEN MAX(Is_Manual_Invoice) = 0 THEN SUM(CASE WHEN transaction_category = 'SUBSCRIPTION_FEE' THEN ABS(settlement_amount) END)
          WHEN MAX(Is_Manual_Invoice) = 1 THEN COUNT(DISTINCT CASE WHEN transaction_category = 'INCOME' THEN CONCAT(business_id, '_', settlement_date) END) * 1500
          ELSE SUM(settlement_amount)
        END as settlement_value
      FROM \`ledger-fcc1e.key_account_reports.retail_order_transaction_summary\`
      WHERE phone_number = @uid
        AND DATE(settlement_date) BETWEEN @startDate AND @endDate
        AND transaction_status = 'SUCCESS'
        ${storeFilter}
      GROUP BY DATE(settlement_date)
      ORDER BY date ASC
    `;

    const [dailySettlementRows] = await bigquery.query({
      query: dailySettlementQuery,
      params: { uid, startDate, endDate, ...storeParam },
    });

    // Monthly trends - transactions by transaction_date_jkt
    const monthlyQuery = `
      SELECT
        DATE_TRUNC(DATE(transaction_date_jkt), MONTH) as month,
        SUM(total_transactions) as transactions,
        SUM(total_value) as value
      FROM \`${process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID}.${process.env.NEXT_PUBLIC_BIGQUERY_DATASET}.daily_summary_by_uid\`
      WHERE uid = @uid
        AND DATE(transaction_date_jkt) BETWEEN @startDate AND @endDate
      GROUP BY DATE_TRUNC(DATE(transaction_date_jkt), MONTH)
      ORDER BY month ASC
    `;

    const [monthlyRows] = await bigquery.query({
      query: monthlyQuery,
      params: { uid, startDate, endDate },
    });

    // Monthly settlement trends - settlements and settlement value by settlement_date
    const monthlySettlementQuery = `
      SELECT
        DATE_TRUNC(DATE(settlement_date), MONTH) as month,
        COUNT(DISTINCT CONCAT(CAST(business_id AS STRING), CAST(DATE(settlement_date) AS STRING))) as settlement_days,
        CASE
          WHEN MAX(Is_Manual_Invoice) = 0 THEN SUM(CASE WHEN transaction_category = 'SUBSCRIPTION_FEE' THEN ABS(settlement_amount) END)
          WHEN MAX(Is_Manual_Invoice) = 1 THEN COUNT(DISTINCT CASE WHEN transaction_category = 'INCOME' THEN CONCAT(business_id, '_', settlement_date) END) * 1500
          ELSE SUM(settlement_amount)
        END as settlement_value
      FROM \`ledger-fcc1e.key_account_reports.retail_order_transaction_summary\`
      WHERE phone_number = @uid
        AND DATE(settlement_date) BETWEEN @startDate AND @endDate
        AND transaction_status = 'SUCCESS'
      GROUP BY DATE_TRUNC(DATE(settlement_date), MONTH)
      ORDER BY month ASC
    `;

    const [monthlySettlementRows] = await bigquery.query({
      query: monthlySettlementQuery,
      params: { uid, startDate, endDate },
    });

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

    // Create maps for settlement data lookup by date
    const settlementMap = new Map();
    try {
      dailySettlementRows.forEach((row: any) => {
        const dateKey = formatDate(row.date);
        settlementMap.set(dateKey, {
          settlement_days: toNumber(row.settlement_days),
          settlement_value: toNumber(row.settlement_value),
        });
      });
    } catch (e) {
      console.error('Settlement map creation error:', e);
    }

    const monthlySettlementMap = new Map();
    try {
      monthlySettlementRows.forEach((row: any) => {
        const monthKey = formatDate(row.month);
        monthlySettlementMap.set(monthKey, {
          settlement_days: toNumber(row.settlement_days),
          settlement_value: toNumber(row.settlement_value),
        });
      });
    } catch (e) {
      console.error('Monthly settlement map creation error:', e);
    }

    const dailyData = dailyRows.map((row: any) => {
      try {
        const date = formatDate(row.date);
        const settlementData = settlementMap.get(date);
        return {
          date: date,
          transactions: toNumber(row.transactions),
          value: toNumber(row.value),
          settlement_days: settlementData ? settlementData.settlement_days : 0,
          settlement_value: settlementData ? settlementData.settlement_value : 0,
        };
      } catch (e) {
        console.error('Daily row mapping error:', e, 'row:', JSON.stringify(row));
        throw e;
      }
    });

    const monthlyData = monthlyRows.map((row: any) => {
      try {
        const month = formatDate(row.month);
        const settlementData = monthlySettlementMap.get(month);
        return {
          month: month,
          transactions: toNumber(row.transactions),
          value: toNumber(row.value),
          settlement_days: settlementData ? settlementData.settlement_days : 0,
          settlement_value: settlementData ? settlementData.settlement_value : 0,
        };
      } catch (e) {
        console.error('Monthly row mapping error:', e, 'row:', JSON.stringify(row));
        throw e;
      }
    });

    console.log('Trends data prepared:', { dailyDataLength: dailyData.length, monthlyDataLength: monthlyData.length });
    return NextResponse.json({
      daily: dailyData,
      monthly: monthlyData,
    });
  } catch (error) {
    console.error('Trends error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      {
        error: 'Failed to fetch trends',
        details: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    );
  }
}
