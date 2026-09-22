import React, { useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DashboardStats, AdminUser } from '../types';

interface Props {
  title: string;
  stats?: DashboardStats | null;
  user?: AdminUser | null;
  onRefresh: () => Promise<void>;
}

export const Header: React.FC<Props> = ({ title, stats, user, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const interventionCount = stats?.kpis?.interventionRequired ?? 0;

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800/80 px-6 flex items-center justify-between shrink-0 z-10">
      {/* Left: View Title & Alerts */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-semibold text-white tracking-tight truncate">
          {title}
        </h1>

        {interventionCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{interventionCount} Needs Attention</span>
          </span>
        )}
      </div>

      {/* Right: Clean Operational Controls */}
      <div className="flex items-center gap-3">
        {/* Live System Pulse Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Sync</span>
        </div>

        {/* Subtle Sync Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title={`Last updated: ${lastRefreshed}`}
          className="h-8 px-2.5 flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-zinc-200' : 'text-zinc-400'}`} />
          <span>Sync</span>
        </button>
      </div>
    </header>
  );
};
export default Header;
