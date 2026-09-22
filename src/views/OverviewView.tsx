import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Zap, 
  Wallet, 
  ShieldAlert,
  Coins, 
  ArrowUpRight, 
  Server, 
  CheckCircle2, 
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { DashboardStats, DiscoHealth, OrderItem, OrderTrend } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../api';
import { RevenueTrendChart, DiscoDistributionChart } from '../components/AnalyticsCharts';

interface Props {
  stats: DashboardStats | null;
  discos: DiscoHealth[];
  recentOrders: OrderItem[];
  onSelectOrder: (order: OrderItem) => void;
  onNavigateToSupport: () => void;
  onNavigateToAccounting: () => void;
  onNavigateToAnalytics?: () => void;
}

export const OverviewView: React.FC<Props> = ({
  stats,
  discos,
  recentOrders,
  onSelectOrder,
  onNavigateToSupport,
  onNavigateToAccounting,
  onNavigateToAnalytics,
}) => {
  const kpis = stats?.kpis;
  const wallet = stats?.wallet;

  const [trends, setTrends] = useState<OrderTrend[]>([]);
  const [days, setDays] = useState<number>(14);
  const [loadingTrends, setLoadingTrends] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingTrends(true);
    api.getTrends(days)
      .then((data) => {
        if (isMounted) setTrends(data || []);
      })
      .catch((err) => {
        console.error('Failed to load overview trends:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingTrends(false);
      });

    return () => {
      isMounted = false;
    };
  }, [days]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Intervention Alert if any */}
      {(kpis?.interventionRequired ?? 0) > 0 && (
        <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-rose-200">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <span>
              <strong className="text-white font-semibold">{kpis?.interventionRequired} order(s)</strong> require manual attention or wallet top-up retry.
            </span>
          </div>
          <button
            onClick={onNavigateToSupport}
            className="px-3.5 h-8 rounded-lg bg-rose-900/90 hover:bg-rose-800 text-white text-xs font-semibold transition-colors"
          >
            Review in Support Desk →
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gross Volume */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 shadow-xs space-y-3 transition-colors hover:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Gross Sales Volume</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums tracking-tight font-mono">
            ₦{(kpis?.totalRevenue ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-400 flex items-center gap-2 pt-2 border-t border-zinc-800/60">
            <span className="text-zinc-300 font-medium tabular-nums">{kpis?.totalOrders ?? 0} total orders</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400 tabular-nums">Today: ₦{(kpis?.today?.customerPaid ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Net Profit Margin */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 shadow-xs space-y-3 transition-colors hover:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Net Retained Margin</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums tracking-tight font-mono">
            ₦{(kpis?.netProfit ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <span className="text-zinc-400 font-mono text-[11px]">1.5% BP + ₦100 - Monnify</span>
            <button
              onClick={onNavigateToAccounting}
              className="text-zinc-300 hover:text-white font-medium flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              Ledger <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Fulfillment Rate & Units */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 shadow-xs space-y-3 transition-colors hover:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Fulfillment Success Rate</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums tracking-tight flex items-baseline gap-2 font-mono">
            <span>{kpis?.successRate ?? 100}%</span>
            <span className="text-xs font-normal text-emerald-400 tabular-nums">
              ({kpis?.successOrders ?? 0} ok)
            </span>
          </div>
          <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-800/60">
            Delivered: <span className="text-zinc-200 font-semibold tabular-nums font-mono">{kpis?.totalUnitsDelivered ?? 0} kWh</span>
          </div>
        </div>

        {/* BuyPower Provider Wallet */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 shadow-xs space-y-3 transition-colors hover:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">BuyPower Live Balance</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums tracking-tight font-mono">
            ₦{(wallet?.balance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <span>Commission: <strong className="text-emerald-400 tabular-nums font-mono">₦{(wallet?.commissionBalance ?? 0).toLocaleString()}</strong></span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
              (wallet?.balance ?? 0) < 50000 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {wallet?.status || 'HEALTHY'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Analytics & Vending Trends Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <RevenueTrendChart
            data={trends}
            loading={loadingTrends}
            days={days}
            onDaysChange={setDays}
          />
        </div>
        <div className="lg:col-span-4">
          <DiscoDistributionChart discos={discos} />
        </div>
      </div>

      {/* Two Columns: DISCO Health & Recent Live Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DISCO Real-Time Health Status Table */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden flex flex-col shadow-xs">
          <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-zinc-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                DISCO Network Health
              </h2>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">Live Sync</span>
          </div>

          <div className="divide-y divide-zinc-800/60 overflow-y-auto max-h-[420px]">
            {discos.map((d) => (
              <div
                key={d.disco}
                className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-zinc-100">
                    {d.disco}
                  </div>
                  <div className="text-[11px] text-zinc-500 tabular-nums font-mono mt-0.5">
                    {d.totalOrders} total • {d.successOrders} ok • {d.failedOrders} fail
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold tabular-nums text-zinc-200 font-mono">
                    {d.successRate}%
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    d.status === 'OPERATIONAL'
                      ? 'bg-emerald-400'
                      : d.status === 'DEGRADED'
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Recent Transactions Feed */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden flex flex-col shadow-xs">
          <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-zinc-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Live Transaction Activity
              </h2>
            </div>
            <button
              onClick={onNavigateToSupport}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Support Desk <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-zinc-400 text-[11px] font-medium">
                  <th className="py-2.5 px-3.5 font-normal">Reference</th>
                  <th className="py-2.5 px-3.5 font-normal">Customer & Meter</th>
                  <th className="py-2.5 px-3.5 font-normal">DISCO</th>
                  <th className="py-2.5 px-3.5 font-normal">Amount</th>
                  <th className="py-2.5 px-3.5 font-normal">Status</th>
                  <th className="py-2.5 px-3.5 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {recentOrders.slice(0, 8).map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-zinc-800/30 transition-colors h-11"
                  >
                    <td className="py-2 px-3.5 font-mono font-medium text-zinc-200 text-xs">
                      {order.reference}
                    </td>
                    <td className="py-2 px-3.5">
                      <div className="text-zinc-200 font-medium font-mono">{order.customerPhone}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{order.meterNumber}</div>
                    </td>
                    <td className="py-2 px-3.5 font-medium text-zinc-300">
                      {order.disco}
                    </td>
                    <td className="py-2 px-3.5 font-medium text-white tabular-nums font-mono">
                      ₦{order.amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3.5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-2 px-3.5 text-right">
                      <button
                        onClick={() => onSelectOrder(order)}
                        className="px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-xs font-medium cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500 text-xs">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
