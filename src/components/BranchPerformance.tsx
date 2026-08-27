'use client';

import { useEffect, useState } from 'react';
import { TableSkeleton } from './SkeletonCard';

interface Branch {
  business_id: string;
  store_name: string;
  total_transactions: number;
  total_transactions_change: number;
  total_value: number;
  total_value_change: number;
  settlement_days: number;
  settlement_days_change: number;
  settlement_value: number;
  settlement_value_change: number;
}

interface BranchPerformanceProps {
  period?: string;
  metric?: string;
  store?: string;
  fromDate?: string;
  toDate?: string;
}

export default function BranchPerformance({ period = 'mtd', metric = 'total_transactions', store = '', fromDate = '', toDate = '' }: BranchPerformanceProps) {
  console.log('BranchPerformance component loaded');
  const [top10, setTop10] = useState<Branch[]>([]);
  const [bottom10, setBottom10] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('BranchPerformance fetching with metric:', metric, 'period:', period, 'store:', store);
        const url = new URL(`/api/dashboard/branch-performance`, window.location.origin);
        url.searchParams.set('period', period);
        url.searchParams.set('metric', metric);
        if (store) url.searchParams.set('store', store);
        if (period === 'custom' && fromDate && toDate) {
          url.searchParams.set('customStartDate', fromDate);
          url.searchParams.set('customEndDate', toDate);
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch branch performance');
        const json = await res.json();
        console.log('BranchPerformance fetch success:', json.metric, 'top10:', json.top10?.length, 'bottom10:', json.bottom10?.length);
        setTop10(json.top10 || []);
        setBottom10(json.bottom10 || []);
        setError(null);
      } catch (err) {
        const errorMsg = (err as Error).message;
        console.error('BranchPerformance fetch error:', errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, metric, store, fromDate, toDate, setTop10, setBottom10]);

  console.log('BranchPerformance rendering - top10:', top10.length, 'bottom10:', bottom10.length, 'loading:', loading);

  if (loading) return <TableSkeleton />;
  if (error) return <div className="text-red-600 py-8">{error}</div>;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(num));
  };

  const renderChange = (value: number) => {
    if (value === 0) {
      return <span className="text-xs font-semibold text-gray-500">— 0.00%</span>;
    }
    const isPositive = value > 0;
    return (
      <span className={`text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(value).toFixed(2)}%
      </span>
    );
  };

  const getMetricLabel = () => {
    const labels: Record<string, string> = {
      transactions: 'Transactions',
      transaction_value: 'Value',
      settlement_value: 'Settlement Value',
      settlement_days: 'Settlement Days',
      total_transactions: 'Transactions',
      total_value: 'Value',
    };
    return labels[metric] || 'Transactions';
  };

  const renderTable = (branches: Branch[], title: string) => (
    <div className="mt-8">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 border-gray-200">
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Store Name</th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700">Transactions</th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700">Value</th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700">Settlement Days</th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700">Settlement Value</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch, idx) => (
              <tr
                key={branch.business_id}
                className={`border-b transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-blue-50 border-gray-100`}
              >
                <td className="py-4 px-4 text-gray-900 font-medium">{branch.store_name}</td>
                <td className="text-right py-4 px-4">
                  <div className="font-semibold text-gray-900">{formatNumber(branch.total_transactions)}</div>
                  <div className="text-xs">{renderChange(branch.total_transactions_change)}</div>
                </td>
                <td className="text-right py-4 px-4">
                  <div className="font-semibold text-gray-900">{formatCurrency(branch.total_value)}</div>
                  <div className="text-xs">{renderChange(branch.total_value_change)}</div>
                </td>
                <td className="text-right py-4 px-4">
                  <div className="font-semibold text-gray-900">{formatNumber(branch.settlement_days)}</div>
                  <div className="text-xs">{renderChange(branch.settlement_days_change)}</div>
                </td>
                <td className="text-right py-4 px-4">
                  <div className="font-semibold text-gray-900">{formatCurrency(branch.settlement_value)}</div>
                  <div className="text-xs">{renderChange(branch.settlement_value_change)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-8 border border-white/60">
      <h3 className="text-2xl font-bold text-gray-900 mb-8 tracking-tight">Store Performance</h3>

      {top10.length > 0 ? renderTable(top10, `Top 10 by ${getMetricLabel()}`) : <p className="text-gray-500">No data available</p>}
      {bottom10.length > 0 ? renderTable(bottom10, `Bottom 10 by ${getMetricLabel()} (Active Stores)`) : <p className="text-gray-500">No data available</p>}
    </div>
  );
}
