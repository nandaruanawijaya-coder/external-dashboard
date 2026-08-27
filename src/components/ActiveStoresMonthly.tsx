'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StoreData {
  date: string;
  active_stores: number;
}

interface MonthlyData {
  month: string;
  active_stores: number;
}

export default function ActiveStoresMonthly() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch with a wide date range (90d) to get multiple months
        const res = await fetch('/api/dashboard/active-stores?period=90d');
        if (!res.ok) throw new Error('Failed to fetch active stores');
        const json = await res.json();

        // Group data by month
        const monthMap = new Map<string, number[]>();
        (json.data || []).forEach((item: StoreData) => {
          const date = new Date(item.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, []);
          }
          monthMap.get(monthKey)!.push(item.active_stores);
        });

        // Calculate average for each month
        const monthly = Array.from(monthMap.entries())
          .map(([month, values]) => ({
            month,
            active_stores: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        setMonthlyData(monthly);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-600 py-8">{error}</div>;

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  };

  const chartData = monthlyData.map((d) => ({
    ...d,
    month: formatMonth(d.month),
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-6">Active Stores - Monthly Trend</h3>
      <ResponsiveContainer width="100%" height={600}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="active_stores"
            fill="#2563eb"
            name="Avg Active Stores"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
