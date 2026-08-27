'use client';

import { useEffect, useState } from 'react';

interface TrendData {
  date: string;
  transactions: number;
  value: number;
  settlement_days?: number;
  settlement_value?: number;
}

interface CalendarHeatmapProps {
  period?: string;
  metric?: string;
  store?: string;
  fromDate?: string;
  toDate?: string;
}

export default function CalendarHeatmap({
  period = 'mtd',
  metric = 'transactions',
  store = '',
  fromDate = '',
  toDate = '',
}: CalendarHeatmapProps) {
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<TrendData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; showAbove: boolean }>({ x: 0, y: 0, showAbove: true });

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

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-600 py-8">{error}</div>;

  const getMetricValue = (d: TrendData): number => {
    switch (metric) {
      case 'transaction_value':
        return d.value || 0;
      case 'settlement_value':
        return (d as any).settlement_value || 0;
      case 'settlement_days':
        return (d as any).settlement_days || 0;
      default:
        return d.transactions || 0;
    }
  };

  const getMetricLabel = () => {
    const labels: Record<string, string> = {
      transactions: 'Transactions',
      transaction_value: 'Transaction Value',
      settlement_value: 'Settlement Value',
      settlement_days: 'Settlement Days',
    };
    return labels[metric] || 'Transactions';
  };

  const values = data.map(getMetricValue);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  const getColor = (value: number) => {
    if (maxValue === minValue) return 'bg-blue-200';
    const normalized = (value - minValue) / (maxValue - minValue);
    if (normalized > 0.75) return 'bg-green-600';
    if (normalized > 0.5) return 'bg-green-400';
    if (normalized > 0.25) return 'bg-yellow-300';
    return 'bg-red-300';
  };

  const numWeeks = Math.ceil(data.length / 7);
  const groupedByWeek = Array.from({ length: numWeeks }, (_, weekIdx) => {
    const week: (TrendData | null)[] = [];
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dataIdx = weekIdx * 7 + dayIdx;
      week.push(dataIdx < data.length ? data[dataIdx] : null);
    }
    return week;
  });

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const formatValue = (value: number) => {
    if (metric === 'transaction_value') {
      if (value >= 1e9) return `Rp ${(value / 1e9).toFixed(1)}B`;
      if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `Rp ${(value / 1e3).toFixed(1)}K`;
      return `Rp ${value.toFixed(0)}`;
    }
    return value.toLocaleString();
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return 'N/A';
    if (value >= 1e9) return `Rp ${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `Rp ${(value / 1e3).toFixed(2)}K`;
    return `Rp ${value.toFixed(0)}`;
  };

  return (
    <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm p-8 border border-gray-200/50">
      <h3 className="text-lg font-semibold mb-6">{getMetricLabel()} - Daily Calendar</h3>

      <div className="overflow-x-auto relative">
        <div className="inline-block">
          {/* Day labels */}
          <div className="flex gap-1 mb-2">
            <div className="w-12" />
            {dayLabels.map((day) => (
              <div key={day} className="w-10 text-center text-xs font-medium text-gray-600">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {groupedByWeek.map((week, weekIdx) => (
            <div key={weekIdx} className="flex gap-1 mb-1">
              <div className="w-12 text-xs text-gray-600 pt-1">W{weekIdx + 1}</div>
              {week.map((dayData, dayIdx) => (
                <div
                  key={`${weekIdx}-${dayIdx}`}
                  className={`w-10 h-10 rounded text-xs font-medium flex items-center justify-center cursor-pointer transition hover:ring-2 hover:ring-blue-400 ${
                    dayData
                      ? getColor(getMetricValue(dayData))
                      : 'bg-gray-100'
                  }`}
                  onMouseEnter={(e) => {
                    setHoveredDate(dayData);
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const spaceAbove = rect.top;
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const showAbove = spaceAbove > 160 || spaceBelow < 160;
                    setTooltipPos({ x: rect.right + 10, y: showAbove ? rect.top : rect.bottom, showAbove });
                  }}
                  onMouseLeave={() => setHoveredDate(null)}
                >
                  {dayData ? new Date(dayData.date).getDate() : ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredDate && (
        <div
          className="fixed p-4 bg-blue-50 border border-blue-300 rounded-lg shadow-lg z-50 pointer-events-none w-64"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: tooltipPos.showAbove ? 'translateY(-100%)' : 'translateY(10px)',
          }}
        >
          <p className="font-semibold text-gray-900 mb-2">{hoveredDate.date}</p>
          <div className="space-y-1 text-sm text-gray-700">
            <p>Transactions: <span className="font-medium">{hoveredDate.transactions?.toLocaleString() || 'N/A'}</span></p>
            <p>Transaction Value: <span className="font-medium">{formatCurrency(hoveredDate.value)}</span></p>
            <p>Settlement Days: <span className="font-medium">{(hoveredDate as any).settlement_days?.toLocaleString() || 'N/A'}</span></p>
            <p>Settlement Value: <span className="font-medium">{formatCurrency((hoveredDate as any).settlement_value)}</span></p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center gap-4 text-xs">
        <span className="font-medium text-gray-700">Legend:</span>
        <div className="flex gap-2">
          <div className="w-4 h-4 bg-red-300 rounded" />
          <span>Low</span>
        </div>
        <div className="flex gap-2">
          <div className="w-4 h-4 bg-yellow-300 rounded" />
          <span>Medium</span>
        </div>
        <div className="flex gap-2">
          <div className="w-4 h-4 bg-green-400 rounded" />
          <span>High</span>
        </div>
        <div className="flex gap-2">
          <div className="w-4 h-4 bg-green-600 rounded" />
          <span>Very High</span>
        </div>
      </div>
    </div>
  );
}
