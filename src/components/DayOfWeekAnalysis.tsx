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
import { ChartSkeleton } from './SkeletonCard';

interface DayData {
  day: string;
  transactions: number;
  value: number;
}

interface DayOfWeekAnalysisProps {
  period?: string;
  store?: string;
  fromDate?: string;
  toDate?: string;
}

export default function DayOfWeekAnalysis({ period = 'mtd', store = '', fromDate = '', toDate = '' }: DayOfWeekAnalysisProps) {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = new URL(`/api/dashboard/day-of-week`, window.location.origin);
        url.searchParams.set('period', period);
        if (store) url.searchParams.set('store', store);
        if (period === 'custom' && fromDate && toDate) {
          url.searchParams.set('customStartDate', fromDate);
          url.searchParams.set('customEndDate', toDate);
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch day of week data');
        const json = await res.json();
        setData(json.data || []);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, store, fromDate, toDate]);

  if (loading) return <ChartSkeleton />;
  if (error) return <div className="text-red-600 py-8">{error}</div>;

  const formatYAxis = (value: number) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatTooltip = (value: any) => {
    const num = typeof value === 'number' ? value : 0;
    if (num >= 1e6) {
      return `IDR ${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
      return `IDR ${(num / 1e3).toFixed(2)}K`;
    } else {
      return `IDR ${num.toFixed(0)}`;
    }
  };

  const formatCustomTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}:{' '}
              {entry.name === 'Transactions'
                ? entry.value.toLocaleString()
                : `Rp ${(entry.value / 1e6).toFixed(2)}M`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-8 border border-white/60">
      <div className="mb-2">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Transactions by Day of Week</h3>
        <p className="text-sm text-gray-600 mt-1">Total transactions and value aggregated for each day across the period</p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={formatYAxis}
            axisLine={{ stroke: '#e5e7eb' }}
            label={{ value: 'Transactions', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={formatYAxis}
            axisLine={{ stroke: '#e5e7eb' }}
            label={{ value: 'Value (IDR)', angle: 90, position: 'insideRight' }}
          />
          <Tooltip content={formatCustomTooltip} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar yAxisId="left" dataKey="transactions" fill="#2563eb" name="Transactions" radius={[8, 8, 0, 0]} />
          <Bar yAxisId="right" dataKey="value" fill="#f59e0b" name="Value (IDR)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
