'use client';

import { useEffect, useState } from 'react';
import Sparkline from './Sparkline';
import { ScorecardSkeleton } from './SkeletonCard';

interface ScorecardData {
  total_transactions: number;
  total_transactions_change: number;
  total_value: number;
  total_value_change: number;
  active_branches: number;
  total_stores: number;
  active_branches_percentage: number;
  total_settlement_value: number;
  total_settlement_value_change: number;
  total_settlement: number;
  total_settlement_change: number;
}

interface ScorecardProps {
  period?: string;
  fromDate?: string;
  toDate?: string;
}

export default function Scorecard({ period = 'mtd', fromDate = '', toDate = '' }: ScorecardProps) {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = new URL('/api/dashboard/scorecard', window.location.origin);
        url.searchParams.set('period', period);
        if (period === 'custom' && fromDate && toDate) {
          url.searchParams.set('customStartDate', fromDate);
          url.searchParams.set('customEndDate', toDate);
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch scorecard');
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, fromDate, toDate]);

  if (loading) return <ScorecardSkeleton />;
  if (error) return <div className="text-red-600 py-8">{error}</div>;
  if (!data) return null;

  const formatNumber = (num: number) => {
    if (isNaN(num) || num === null || num === undefined) return '0';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(num));
  };

  const renderChange = (value: number, isPercentage?: boolean) => {
    if (isPercentage) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">{value.toFixed(1)}% active</span>
        </div>
      );
    }
    const isPositive = value >= 0;
    const color = isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${color}`}>
        <span className="font-semibold text-xs">
          {isPositive ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
        </span>
      </div>
    );
  };

  const mockSparklineData = [
    { value: 80 }, { value: 85 }, { value: 82 }, { value: 88 }, { value: 90 },
    { value: 87 }, { value: 92 }, { value: 89 }, { value: 94 }, { value: 91 },
  ];

  const cards = [
    {
      title: 'Total Transactions',
      value: formatNumber(data.total_transactions),
      change: data.total_transactions_change,
      icon: '📊',
      bgColor: 'bg-blue-50',
      sparklineColor: '#3b82f6',
    },
    {
      title: 'Total Value',
      value: formatCurrency(data.total_value),
      change: data.total_value_change,
      icon: '💰',
      bgColor: 'bg-emerald-50',
      sparklineColor: '#10b981',
    },
    {
      title: 'Active Branches',
      value: `${formatNumber(data.active_branches)}/${formatNumber(data.total_stores)}`,
      change: data.active_branches_percentage,
      isPercentage: true,
      icon: '🏪',
      bgColor: 'bg-purple-50',
      sparklineColor: '#a855f7',
    },
    {
      title: 'Settlement Value',
      value: formatCurrency(data.total_settlement_value),
      change: data.total_settlement_value_change,
      icon: '✓',
      bgColor: 'bg-amber-50',
      sparklineColor: '#f59e0b',
    },
    {
      title: 'Total Settlement',
      value: formatNumber(data.total_settlement),
      change: data.total_settlement_change,
      icon: '📋',
      bgColor: 'bg-rose-50',
      sparklineColor: '#ef4444',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards.map((card: any, idx) => (
        <div
          key={idx}
          className={`${card.bgColor} rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-white/60 backdrop-blur-sm group relative overflow-hidden`}
        >
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl opacity-80 group-hover:opacity-100 transition-opacity">{card.icon}</span>
                  <h3 className="text-gray-600 text-xs font-semibold tracking-widest uppercase letter-spacing">
                    {card.title}
                  </h3>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-4 leading-tight tracking-tight">
                  {card.value}
                </p>
              </div>
            </div>

            {/* Sparkline */}
            <div className="mb-4 h-10 -mx-2 opacity-70 group-hover:opacity-100 transition-opacity">
              <Sparkline data={mockSparklineData} color={card.sparklineColor} />
            </div>

            {/* Change indicator */}
            {card.change !== null && renderChange(card.change, card.isPercentage)}
          </div>
        </div>
      ))}
    </div>
  );
}
