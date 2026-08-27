'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartSkeleton } from './SkeletonCard';

interface TrendData {
  date: string;
  transactions: number;
  value: number;
  settlement_days?: number;
  settlement_value?: number;
}

interface TrendsChartEnhancedProps {
  period?: string;
  metric?: string;
  store?: string;
  fromDate?: string;
  toDate?: string;
}

export default function TrendsChartEnhanced({
  period = 'mtd',
  metric = 'transactions',
  store = '',
  fromDate = '',
  toDate = '',
}: TrendsChartEnhancedProps) {
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = new URL(`/api/dashboard/trends`, window.location.origin);
        url.searchParams.set('period', period);
        if (store) url.searchParams.set('store', store);
        if (period === 'custom' && fromDate && toDate) {
          url.searchParams.set('customStartDate', fromDate);
          url.searchParams.set('customEndDate', toDate);
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch trends');
        const json = await res.json();
        setData(json.daily || []);
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

  const getMetricLabel = () => {
    const labels: Record<string, string> = {
      transactions: 'Transactions',
      transaction_value: 'Transaction Value (IDR)',
      settlement_value: 'Settlement Value (IDR)',
      settlement_days: 'Settlement Days',
    };
    return labels[metric] || 'Transactions';
  };

  const getChartData = () => {
    return data.map((d) => {
      let value = 0;
      if (metric === 'transaction_value') {
        value = d.value;
      } else if (metric === 'settlement_value') {
        value = d.settlement_value || 0;
      } else if (metric === 'settlement_days') {
        value = d.settlement_days || 0;
      } else {
        value = d.transactions;
      }
      return { date: d.date, value };
    });
  };

  const formatYAxis = (value: number) => {
    if (metric === 'transaction_value' || metric === 'settlement_value') {
      if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
      return value.toFixed(0);
    }
    if (metric === 'settlement_days') {
      return value.toFixed(0);
    }
    return value.toLocaleString();
  };

  const formatTooltip = (value: any) => {
    const num = typeof value === 'number' ? value : 0;
    if (metric === 'transaction_value' || metric === 'settlement_value') {
      if (num >= 1e9) {
        return `IDR ${(num / 1e9).toFixed(2)}B`;
      } else if (num >= 1e6) {
        return `IDR ${(num / 1e6).toFixed(2)}M`;
      } else if (num >= 1e3) {
        return `IDR ${(num / 1e3).toFixed(2)}K`;
      } else {
        return `IDR ${num.toFixed(0)}`;
      }
    }
    if (metric === 'settlement_days') {
      return num.toFixed(0) + ' settlements';
    }
    return num.toLocaleString();
  };

  const chartData = getChartData();

  const maxValue = chartData.length > 0
    ? Math.max(...chartData.map(d => d.value))
    : 0;

  const minValue = chartData.length > 0
    ? Math.min(...chartData.map(d => d.value))
    : 0;

  const renderLabel = (props: any) => {
    const { x, y, value } = props;

    // On mobile, only show max and min labels
    if (isMobile && value !== maxValue && value !== minValue) {
      return null;
    }

    let label = '';

    if (metric === 'transaction_value' || metric === 'settlement_value') {
      if (value >= 1e9) label = `${(value / 1e9).toFixed(1)}B`;
      else if (value >= 1e6) label = `${(value / 1e6).toFixed(1)}M`;
      else if (value >= 1e3) label = `${(value / 1e3).toFixed(1)}K`;
      else label = value.toFixed(0);
    } else if (metric === 'settlement_days') {
      label = value.toFixed(0);
    } else {
      label = value.toLocaleString();
    }

    return (
      <text
        x={x}
        y={y - 10}
        fill="#1f2937"
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
      >
        {label}
      </text>
    );
  };

  const renderDot = (props: any) => {
    const { cx, cy, value } = props;
    let fillColor = '#2563eb';
    let radius = 4;

    if (value === maxValue) {
      fillColor = '#34d399';
      radius = 5;
    } else if (value === minValue) {
      fillColor = '#fbbf24';
      radius = 5;
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={fillColor}
        stroke="#ffffff"
        strokeWidth={1.5}
      />
    );
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-8 border border-white/60">
      <h3 className="text-2xl font-bold text-gray-900 mb-8 tracking-tight">{getMetricLabel()} Trend</h3>
      <ResponsiveContainer width="100%" height={600}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <ReferenceLine
            y={maxValue}
            stroke="#34d399"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{
              value: 'Max',
              position: 'right',
              fill: '#34d399',
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <ReferenceLine
            y={minValue}
            stroke="#fbbf24"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{
              value: 'Min',
              position: 'right',
              fill: '#fbbf24',
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={formatYAxis}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip
            formatter={formatTooltip}
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            labelStyle={{ color: '#374151' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            dot={renderDot}
            activeDot={{ r: 6 }}
            name={getMetricLabel()}
            strokeWidth={2}
            isAnimationActive={true}
            label={renderLabel}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
