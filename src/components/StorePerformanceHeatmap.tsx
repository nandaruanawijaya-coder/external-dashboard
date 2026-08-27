'use client';

import { useEffect, useState } from 'react';

interface Branch {
  business_id: string;
  store_name: string;
  total_transactions: number;
  total_value: number;
  settlement_days: number;
}

interface StorePerformanceHeatmapProps {
  period?: string;
  metric?: string;
}

export default function StorePerformanceHeatmap({
  period = 'mtd',
  metric = 'transactions',
}: StorePerformanceHeatmapProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/dashboard/branch-performance?period=${period}&page=1`);
        if (!res.ok) throw new Error('Failed to fetch branches');
        const json = await res.json();
        setBranches(json.branches || []);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-600 py-8">{error}</div>;

  const getMetricValue = (branch: Branch): number => {
    switch (metric) {
      case 'transaction_value':
        return branch.total_value;
      case 'settlement_days':
        return branch.settlement_days;
      case 'transactions':
      default:
        return branch.total_transactions;
    }
  };

  const getMetricLabel = () => {
    const labels: Record<string, string> = {
      transactions: 'Transactions',
      transaction_value: 'Transaction Value',
      settlement_days: 'Settlement Days',
    };
    return labels[metric] || 'Transactions';
  };

  const getColor = (value: number, max: number, min: number) => {
    if (max === min) return 'bg-blue-300';
    const normalized = (value - min) / (max - min);
    if (normalized > 0.75) return 'bg-green-600';
    if (normalized > 0.5) return 'bg-green-400';
    if (normalized > 0.25) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const maxValue = Math.max(...branches.map(getMetricValue));
  const minValue = Math.min(...branches.map(getMetricValue));
  const topStores = branches.slice(0, 10);
  const bottomStores = branches.slice(-10).reverse();

  const formatValue = (value: number) => {
    if (metric === 'transaction_value') {
      return `Rp ${(value / 1e9).toFixed(1)}B`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Top Performers */}
      <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm p-8 border border-gray-200/50">
        <h3 className="text-lg font-semibold mb-4">Top 10 Stores - {getMetricLabel()}</h3>
        <div className="space-y-2">
          {topStores.map((branch, idx) => {
            const value = getMetricValue(branch);
            const percentage = ((value - minValue) / (maxValue - minValue)) * 100;
            return (
              <div key={branch.business_id} className="flex items-center gap-4">
                <div className="w-8 text-right font-semibold text-gray-600">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {branch.store_name}
                  </p>
                  <div className="relative h-6 bg-gray-100 rounded overflow-hidden mt-1">
                    <div
                      className={`h-full ${getColor(value, maxValue, minValue)} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-end px-2 text-xs font-semibold text-gray-900">
                      {formatValue(value)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Performers */}
      <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm p-8 border border-gray-200/50">
        <h3 className="text-lg font-semibold mb-4">Bottom 10 Stores - {getMetricLabel()}</h3>
        <div className="space-y-2">
          {bottomStores.map((branch, idx) => {
            const value = getMetricValue(branch);
            const percentage = ((value - minValue) / (maxValue - minValue)) * 100;
            return (
              <div key={branch.business_id} className="flex items-center gap-4">
                <div className="w-8 text-right font-semibold text-gray-600">
                  {branches.length - idx}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {branch.store_name}
                  </p>
                  <div className="relative h-6 bg-gray-100 rounded overflow-hidden mt-1">
                    <div
                      className={`h-full ${getColor(value, maxValue, minValue)} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-end px-2 text-xs font-semibold text-gray-900">
                      {formatValue(value)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
