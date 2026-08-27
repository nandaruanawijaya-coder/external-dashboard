'use client';

import { useEffect, useState } from 'react';
import { TableSkeleton } from './SkeletonCard';

interface Store {
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

interface AllStoresProps {
  period?: string;
  store?: string;
  sort?: string;
  fromDate?: string;
  toDate?: string;
}

export default function AllStores({ period = 'mtd', store = '', sort = 'transactions_desc', fromDate = '', toDate = '' }: AllStoresProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = new URL(`/api/dashboard/all-stores`, window.location.origin);
        url.searchParams.set('period', period);
        url.searchParams.set('sort', sort);
        if (store) url.searchParams.set('store', store);
        if (period === 'custom' && fromDate && toDate) {
          url.searchParams.set('customStartDate', fromDate);
          url.searchParams.set('customEndDate', toDate);
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch stores');
        const json = await res.json();
        setStores(json.stores || []);
        setError(null);
      } catch (err) {
        const errorMsg = (err as Error).message;
        console.error('AllStores fetch error:', errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, store, sort, fromDate, toDate]);

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

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-8 border border-white/60">
      <h3 className="text-2xl font-bold text-gray-900 mb-8 tracking-tight">All Stores</h3>

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
            {stores.map((store, idx) => (
              <tr
                key={store.business_id}
                className={`border-b transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-blue-50 border-gray-100`}
              >
                <td className="py-4 px-4 text-gray-900 font-medium">{store.store_name}</td>
                <td className="text-right py-4 px-4">
                  <div className="font-semibold text-gray-900">{formatNumber(store.total_transactions)}</div>
                  <div className="text-xs">{renderChange(store.total_transactions_change)}</div>
                </td>
                <td className="text-right py-4 px-4">
                  <div className="font-semibold text-gray-900">{formatCurrency(store.total_value)}</div>
                  <div className="text-xs">{renderChange(store.total_value_change)}</div>
                </td>
                <td className="text-right py-4 px-4">
                  <div className="font-semibold text-gray-900">{formatNumber(store.settlement_days)}</div>
                  <div className="text-xs">{renderChange(store.settlement_days_change)}</div>
                </td>
                <td className="text-right py-4 px-4">
                  <div className="font-semibold text-gray-900">{formatCurrency(store.settlement_value)}</div>
                  <div className="text-xs">{renderChange(store.settlement_value_change)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stores.length === 0 && (
        <div className="text-center py-8 text-gray-500">No stores found</div>
      )}
    </div>
  );
}
