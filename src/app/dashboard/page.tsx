'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import jwt from 'jsonwebtoken';
import Scorecard from '@/components/Scorecard';
import BranchPerformance from '@/components/BranchPerformance';
import SettlementHistory from '@/components/SettlementHistory';
import ActiveStores from '@/components/ActiveStores';
import PeriodSelector from '@/components/PeriodSelector';
import DateRangeSelector from '@/components/DateRangeSelector';
import MetricsSelector from '@/components/MetricsSelector';
import Tabs from '@/components/Tabs';
import TrendsChartEnhanced from '@/components/TrendsChartEnhanced';
import StorePerformanceHeatmap from '@/components/StorePerformanceHeatmap';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import StoreSelector from '@/components/StoreSelector';
import TransactionStatusSelector from '@/components/TransactionStatusSelector';
import StoreSortSelector from '@/components/StoreSortSelector';
import AllStores from '@/components/AllStores';
import DayOfWeekAnalysis from '@/components/DayOfWeekAnalysis';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('mtd');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [metric, setMetric] = useState('transactions');
  const [store, setStore] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('transactions_desc');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    try {
      const cookieString = document.cookie;
      const tokenMatch = cookieString.match(/auth-token=([^;]+)/);

      if (!tokenMatch) {
        router.push('/login');
        return;
      }

      const token = tokenMatch[1];
      const decoded = jwt.decode(token) as any;

      if (decoded) {
        setUser({
          uid: decoded.uid,
          company_name: decoded.company_name,
        });
      }
    } catch (error) {
      console.error('Error reading user info:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'performance', label: 'Performance' },
    { id: 'settlement', label: 'Settlement' },
    { id: 'stores', label: 'Stores' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      <nav className="bg-white/80 border-b border-white/40 sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {/* BukuWarung Logo */}
              <img src="/600px.png" alt="BukuWarung" className="h-12 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user?.company_name}
                </h1>
                <p className="text-xs text-gray-500 tracking-widest uppercase font-medium">Analytics Dashboard</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 hover:shadow-md font-medium text-sm transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4">
        {/* Top Controls */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-8 mb-10 border border-white/60 relative z-10 overflow-visible">
          <div className="flex flex-col gap-8">
            {/* First Row: Period + Date Range */}
            <div className="flex items-center gap-8 flex-wrap">
              <div>
                <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-4">Period</h2>
                <PeriodSelector period={period} onPeriodChange={setPeriod} />
              </div>
              {period === 'custom' && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-4">Custom Date Range</h2>
                  <DateRangeSelector
                    fromDate={fromDate}
                    toDate={toDate}
                    onDateRangeChange={(from, to) => {
                      setFromDate(from);
                      setToDate(to);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Second Row: Other Filters */}
            <div className="flex items-center gap-8 flex-wrap">
              {activeTab === 'performance' && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-4">Metric</h2>
                  <MetricsSelector metric={metric} onMetricChange={setMetric} />
                </div>
              )}
              {(activeTab === 'performance' || activeTab === 'settlement' || activeTab === 'stores') && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-4">Store</h2>
                  <StoreSelector store={store} onStoreChange={setStore} period={period} />
                </div>
              )}
              {activeTab === 'settlement' && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-4">Transaction Status</h2>
                  <TransactionStatusSelector status={status} onStatusChange={setStatus} />
                </div>
              )}
              {activeTab === 'stores' && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-4">Sort</h2>
                  <StoreSortSelector sort={sort} onSortChange={setSort} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <Scorecard period={period} fromDate={fromDate} toDate={toDate} />
              <ActiveStores period={period} fromDate={fromDate} toDate={toDate} />
            </>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <>
              <TrendsChartEnhanced period={period} metric={metric} store={store} fromDate={fromDate} toDate={toDate} />
              <DayOfWeekAnalysis period={period} store={store} fromDate={fromDate} toDate={toDate} />
              <BranchPerformance period={period} metric={metric} store={store} fromDate={fromDate} toDate={toDate} />
              <CalendarHeatmap period={period} metric={metric} store={store} fromDate={fromDate} toDate={toDate} />
            </>
          )}

          {/* Settlement Tab */}
          {activeTab === 'settlement' && (
            <>
              <SettlementHistory period={period} store={store} status={status} fromDate={fromDate} toDate={toDate} />
            </>
          )}

          {/* Stores Tab */}
          {activeTab === 'stores' && (
            <>
              <AllStores period={period} store={store} sort={sort} fromDate={fromDate} toDate={toDate} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
