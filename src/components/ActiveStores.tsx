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
  ReferenceLine,
  Cell,
} from 'recharts';
import { ChartSkeleton } from './SkeletonCard';

interface StoreData {
  date: string;
  active_stores: number;
}

interface ChartData {
  date: string;
  active_stores: number;
}

interface ActiveStoresProps {
  period?: string;
  fromDate?: string;
  toDate?: string;
}

export default function ActiveStores({ period = 'mtd', fromDate = '', toDate = '' }: ActiveStoresProps) {
  const [totalStores, setTotalStores] = useState(0);
  const [data, setData] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
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
        // For monthly view, always fetch 90 days and use mode=monthly
        // For daily view, use the selected period filter
        const fetchPeriod = viewMode === 'monthly' ? '90d' : period;
        const url = new URL('/api/dashboard/active-stores', window.location.origin);
        url.searchParams.set('period', fetchPeriod);
        url.searchParams.set('mode', viewMode);
        if (period === 'custom' && fromDate && toDate) {
          url.searchParams.set('customStartDate', fromDate);
          url.searchParams.set('customEndDate', toDate);
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Failed to fetch active stores');
        const json = await res.json();
        setTotalStores(json.total_stores || 0);
        setData(json.data || []);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, viewMode, fromDate, toDate]);

  if (loading) return <ChartSkeleton />;
  if (error) return <div className="text-red-600 py-8">{error}</div>;

  // API now handles daily/monthly aggregation, so use data directly
  const displayData = data;

  const avgActiveStores = displayData.length > 0
    ? Math.round(displayData.reduce((sum, d) => sum + d.active_stores, 0) / displayData.length)
    : 0;

  const maxActiveStores = displayData.length > 0
    ? Math.max(...displayData.map(d => d.active_stores))
    : 0;

  const minActiveStores = displayData.length > 0
    ? Math.min(...displayData.map(d => d.active_stores))
    : 0;

  const renderBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    // On mobile, only show max and min labels
    if (isMobile && value !== maxActiveStores && value !== minActiveStores) {
      return null;
    }
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="#1f2937"
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
      >
        {value}
      </text>
    );
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-8 space-y-8 border border-white/60">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Active Stores</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              viewMode === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              viewMode === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 rounded-2xl p-6 border border-white/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
          <p className="text-gray-600 text-xs font-semibold tracking-widest uppercase mb-4 group-hover:text-gray-700">Total Stores</p>
          <p className="text-3xl font-bold text-gray-900">{totalStores}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/50 rounded-2xl p-6 border border-white/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
          <p className="text-gray-600 text-xs font-semibold tracking-widest uppercase mb-4 group-hover:text-gray-700">Avg Active Stores</p>
          <p className="text-3xl font-bold text-gray-900">{avgActiveStores}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-50/50 rounded-2xl p-6 border border-white/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
          <p className="text-gray-600 text-xs font-semibold tracking-widest uppercase mb-4 group-hover:text-gray-700">Max Active Stores</p>
          <p className="text-3xl font-bold text-gray-900">{maxActiveStores}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-50/50 rounded-2xl p-6 border border-white/60 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
          <p className="text-gray-600 text-xs font-semibold tracking-widest uppercase mb-4 group-hover:text-gray-700">Min Active Stores</p>
          <p className="text-3xl font-bold text-gray-900">{minActiveStores}</p>
        </div>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={600}>
        <BarChart data={displayData} margin={{ top: 20, right: 30, left: 0, bottom: viewMode === 'daily' ? 80 : 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={viewMode === 'daily' ? -45 : 0}
            textAnchor={viewMode === 'daily' ? 'end' : 'middle'}
            height={viewMode === 'daily' ? 80 : 40}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value) => [`${value} stores`, 'Active Stores']}
          />
          <ReferenceLine
            y={avgActiveStores}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="square"
          />
          <Bar
            dataKey="active_stores"
            fill="#3b82f6"
            name="Active Stores"
            radius={[8, 8, 0, 0]}
            isAnimationActive={true}
            label={renderBarLabel}
          >
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.active_stores === maxActiveStores
                    ? '#10b981'
                    : entry.active_stores === minActiveStores
                    ? '#f87171'
                    : '#3b82f6'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
