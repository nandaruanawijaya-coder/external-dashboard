'use client';

import { useEffect, useState } from 'react';

interface TrendData {
  date: string;
  transactions: number;
  value: number;
}

interface TrendsChartProps {
  period?: string;
}

export default function TrendsChart({ period = 'mtd' }: TrendsChartProps) {
  const [daily, setDaily] = useState<TrendData[]>([]);
  const [monthly, setMonthly] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/dashboard/trends?period=${period}`);
        if (!res.ok) throw new Error('Failed to fetch trends');
        const json = await res.json();
        setDaily(json.daily || []);
        setMonthly(json.monthly || []);
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(num));
  };

  return (
    <div className="space-y-6">
      {/* Daily Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Trends</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Date</th>
                <th className="text-right py-2 px-4">Transactions</th>
                <th className="text-right py-2 px-4">Value</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{row.date}</td>
                  <td className="text-right py-2 px-4">{formatNumber(row.transactions)}</td>
                  <td className="text-right py-2 px-4">{formatCurrency(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Trends */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Month</th>
                  <th className="text-right py-2 px-4">Transactions</th>
                  <th className="text-right py-2 px-4">Value</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{row.date}</td>
                    <td className="text-right py-2 px-4">{formatNumber(row.transactions)}</td>
                    <td className="text-right py-2 px-4">{formatCurrency(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
