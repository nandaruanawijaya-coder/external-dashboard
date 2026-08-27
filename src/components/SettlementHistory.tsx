'use client';

import { useEffect, useState } from 'react';
import { TableSkeleton } from './SkeletonCard';

interface Settlement {
  settlement_date: string;
  business_id: string;
  store_name: string;
  settlement_amount: number;
  transaction_count: number;
  settlement_status: string;
}

interface SettlementHistoryProps {
  period?: string;
  store?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export default function SettlementHistory({ period = 'mtd', store = '', status = '', fromDate = '', toDate = '' }: SettlementHistoryProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputPage, setInputPage] = useState<string>('1');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = new URL(`/api/dashboard/settlement-history`, window.location.origin);
        url.searchParams.set('period', period);
        url.searchParams.set('page', page.toString());
        if (store) url.searchParams.set('store', store);
        if (status) url.searchParams.set('status', status);
        if (period === 'custom' && fromDate && toDate) {
          url.searchParams.set('customStartDate', fromDate);
          url.searchParams.set('customEndDate', toDate);
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch settlement history');
        const json = await res.json();
        setSettlements(json.settlements || []);
        const newTotalPages = json.totalPages || 1;
        setTotalPages(newTotalPages);

        // If current page exceeds new total pages, jump to max page
        if (page > newTotalPages) {
          setPage(newTotalPages);
          setInputPage(newTotalPages.toString());
        }

        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, page, store, status, fromDate, toDate]);

  if (loading) return <TableSkeleton />;
  if (error) return <div className="text-red-600 py-8">{error}</div>;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(num));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'SUCCESS': 'bg-green-100 text-green-800',
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'FAILED': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-8 border border-white/60">
      <h3 className="text-2xl font-bold text-gray-900 mb-8 tracking-tight">Settlement History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 border-gray-200">
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Date</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Store Name</th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700">Settlement Amount</th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700">Transactions</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((settlement, idx) => (
              <tr
                key={idx}
                className={`border-b transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-blue-50 border-gray-100`}
              >
                <td className="py-4 px-4 text-gray-900">{settlement.settlement_date}</td>
                <td className="py-4 px-4 text-gray-900 font-medium">{settlement.store_name}</td>
                <td className="text-right py-4 px-4 text-gray-900 font-semibold">{formatCurrency(settlement.settlement_amount)}</td>
                <td className="text-right py-4 px-4 text-gray-900">{settlement.transaction_count}</td>
                <td className="text-center py-4 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(settlement.settlement_status)}`}>
                    {settlement.settlement_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-between items-center bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-700 font-medium">Page {page} of {totalPages}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded font-medium disabled:opacity-50 hover:bg-gray-300 transition"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2 border-l border-r border-gray-300 px-3">
            <span className="text-sm text-gray-600">Go to:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const num = Math.min(totalPages, Math.max(1, parseInt(inputPage) || 1));
                  setPage(num);
                  setInputPage(num.toString());
                }
              }}
              className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1"
            />
            <button
              onClick={() => {
                const num = Math.min(totalPages, Math.max(1, parseInt(inputPage) || 1));
                setPage(num);
                setInputPage(num.toString());
              }}
              className="px-2 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              Go
            </button>
          </div>

          <button
            onClick={() => {
              if (page < totalPages) {
                setPage(p => p + 1);
                setInputPage((page + 1).toString());
              }
            }}
            disabled={page >= totalPages}
            className="px-3 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
