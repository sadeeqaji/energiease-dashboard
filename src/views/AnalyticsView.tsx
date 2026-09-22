import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  RefreshCw, 
  TrendingUp, 
  Zap, 
  Layers, 
  DollarSign, 
  Clock, 
  Activity, 
  ArrowUpRight 
} from 'lucide-react';
import { DashboardStats, DiscoHealth, OrderTrend, OrderItem } from '../types';
import { api } from '../api';
import { 
  RevenueTrendChart, 
  DiscoDistributionChart, 
  HourlyActivityChart, 
  ProfitBreakdownChart 
} from '../components/AnalyticsCharts';

interface Props {
  stats: DashboardStats | null;
  discos: DiscoHealth[];
  recentOrders?: OrderItem[];
  onNavigateToAccounting: () => void;
  onNavigateToSupport: () => void;
}

export const AnalyticsView: React.FC<Props> = ({
  stats,
  discos,
  recentOrders = [],
  onNavigateToAccounting,
  onNavigateToSupport,
}) => {
  const [trends, setTrends] = useState<OrderTrend[]>([]);
  const [days, setDays] = useState<number>(14);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTrends = async (numDays: number) => {
    setLoading(true);
    try {
      const data = await api.getTrends(numDays);
      setTrends(data || []);
    } catch (err) {
      console.error('Failed to load order trends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends(days);
  }, [days]);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100">
              Business Intelligence & Analytics
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time transaction velocity, DISCO market distribution, and financial margin analysis
          </p>
        </div>

        <button
          onClick={() => fetchTrends(days)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 hover:text-white transition-all shadow-xs self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-200' : 'text-zinc-400'}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary Analytics Charts Grid: Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Main Revenue Trend Chart (8 cols) */}
        <div className="lg:col-span-8">
          <RevenueTrendChart
            data={trends}
            loading={loading}
            days={days}
            onDaysChange={setDays}
          />
        </div>

        {/* DISCO Market Share Breakdown (4 cols) */}
        <div className="lg:col-span-4">
          <DiscoDistributionChart discos={discos} />
        </div>
      </div>

      {/* Row 2: Hourly Activity & Profit Margins */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Hourly Peak Activity (6 cols) */}
        <div className="lg:col-span-6">
          <HourlyActivityChart orders={recentOrders} />
        </div>

        {/* Financial Margin Waterfall (6 cols) */}
        <div className="lg:col-span-6">
          <ProfitBreakdownChart stats={stats} />
        </div>
      </div>
    </div>
  );
};
export default AnalyticsView;
