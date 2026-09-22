import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieIcon, 
  Clock, 
  DollarSign, 
  Zap, 
  ArrowUpRight, 
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { OrderTrend, DiscoHealth, DashboardStats, OrderItem } from '../types';

// ==========================================
// 1. REVENUE & VENDING VOLUME TREND (AREA SVG)
// ==========================================
interface RevenueTrendProps {
  data: OrderTrend[];
  loading?: boolean;
  days: number;
  onDaysChange: (days: number) => void;
  currency?: string;
}

export const RevenueTrendChart: React.FC<RevenueTrendProps> = ({
  data,
  loading = false,
  days,
  onDaysChange,
  currency = '₦'
}) => {
  const [metric, setMetric] = useState<'sales' | 'orders'>('sales');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Return real database trend data or clean 0-value baseline across the requested days
  const effectiveData = useMemo(() => {
    if (data && data.length > 0) return data;

    const emptyTrends: OrderTrend[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      emptyTrends.push({
        date: d.toISOString().split('T')[0],
        totalSales: 0,
        ordersCount: 0,
        successCount: 0,
        netProfit: 0
      });
    }
    return emptyTrends;
  }, [data, days]);

  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 25, bottom: 35, left: 60 };

  const values = effectiveData.map(d => metric === 'sales' ? d.totalSales : d.ordersCount);
  const maxValue = Math.max(...values, metric === 'sales' ? 50000 : 10) * 1.15;
  const minValue = 0;

  const getX = (index: number) => {
    if (effectiveData.length <= 1) return padding.left;
    return padding.left + (index / (effectiveData.length - 1)) * (width - padding.left - padding.right);
  };

  const getY = (val: number) => {
    const range = maxValue - minValue;
    const norm = range === 0 ? 0.5 : (val - minValue) / range;
    return height - padding.bottom - norm * (height - padding.top - padding.bottom);
  };

  // Generate smooth SVG path (Catmull-Rom to Cubic Bezier)
  const linePath = useMemo(() => {
    if (effectiveData.length === 0) return '';
    const points = effectiveData.map((d, i) => ({
      x: getX(i),
      y: getY(metric === 'sales' ? d.totalSales : d.ordersCount)
    }));

    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  }, [effectiveData, metric, maxValue]);

  const areaPath = useMemo(() => {
    if (!linePath) return '';
    const lastX = getX(effectiveData.length - 1);
    const firstX = getX(0);
    const bottomY = height - padding.bottom;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, effectiveData.length]);

  // Y-axis grid ticks (4 ticks)
  const yTicks = [0, 0.33, 0.66, 1].map(pct => {
    const val = minValue + (maxValue - minValue) * pct;
    return {
      val,
      y: getY(val),
      label: metric === 'sales'
        ? val >= 1000000 
          ? `₦${(val / 1000000).toFixed(1)}M`
          : val >= 1000 
          ? `₦${(val / 1000).toFixed(0)}k` 
          : `₦${Math.round(val)}`
        : Math.round(val).toString()
    };
  });

  // X-axis date labels (every few days)
  const xStep = Math.max(1, Math.floor(effectiveData.length / 7));
  const activeHover = hoverIndex !== null ? effectiveData[hoverIndex] : null;

  const totalVolume = effectiveData.reduce((acc, d) => acc + d.totalSales, 0);
  const totalOrders = effectiveData.reduce((acc, d) => acc + d.ordersCount, 0);
  const totalProfit = effectiveData.reduce((acc, d) => acc + d.netProfit, 0);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-colors hover:border-zinc-700/80">
      {/* Chart Top Bar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
                Revenue & Vending Volume
              </h3>
              <p className="text-xs text-zinc-400">
                Daily trend across {days} days • Total: <strong className="text-zinc-100 font-semibold tabular-nums font-mono">₦{totalVolume.toLocaleString()}</strong> ({totalOrders} orders)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Metric switch */}
          <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => setMetric('sales')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                metric === 'sales'
                  ? 'bg-zinc-800 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sales (₦)
            </button>
            <button
              onClick={() => setMetric('orders')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                metric === 'orders'
                  ? 'bg-zinc-800 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Orders
            </button>
          </div>

          {/* Time range buttons */}
          <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => onDaysChange(d)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  days === d
                    ? 'bg-zinc-800 text-white font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Canvas & Tooltip Container */}
      <div className="relative pt-4 overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Area gradient: refined single-tone blue */}
            <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
              <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Y-Axis Horizontal Grid Lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="#27272A"
                strokeDasharray={i === 0 ? undefined : "3 3"}
                strokeWidth={i === 0 ? "1.5" : "1"}
                strokeOpacity={i === 0 ? "0.8" : "0.5"}
              />
              <text
                x={padding.left - 10}
                y={tick.y + 3.5}
                fill="#64748B"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
                textAnchor="end"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#revenueAreaGrad)" />

          {/* Line Stroke: Crisp, professional solid blue */}
          <path
            d={linePath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points & Invisible hover columns */}
          {effectiveData.map((d, i) => {
            const cx = getX(i);
            const cy = getY(metric === 'sales' ? d.totalSales : d.ordersCount);
            const isHovered = hoverIndex === i;

            return (
              <g key={d.date}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={height - padding.bottom}
                    stroke="#38BDF8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : 3}
                  fill={isHovered ? '#3B82F6' : '#60A5FA'}
                  stroke="#09090b"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Invisible hover capture rect */}
                <rect
                  x={cx - (width / effectiveData.length) / 2}
                  y={0}
                  width={width / effectiveData.length}
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              </g>
            );
          })}

          {/* X-Axis Date Ticks */}
          {effectiveData.map((d, i) => {
            if (i % xStep !== 0 && i !== effectiveData.length - 1) return null;
            const x = getX(i);
            const formatted = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <text
                key={d.date}
                x={x}
                y={height - 10}
                fill="#64748B"
                fontSize="10"
                fontFamily="var(--font-sans), sans-serif"
                textAnchor="middle"
              >
                {formatted}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activeHover && hoverIndex !== null && (
          <div
            className="absolute z-20 pointer-events-none bg-zinc-950/95 border border-zinc-800 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-1 transform -translate-x-1/2 transition-all duration-75"
            style={{
              left: `${(getX(hoverIndex) / width) * 100}%`,
              top: '12px'
            }}
          >
            <div className="font-semibold text-zinc-200 pb-1 border-b border-zinc-800 flex items-center justify-between gap-4">
              <span>{new Date(activeHover.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <span className="text-[10px] text-zinc-400 font-mono">Day {hoverIndex + 1}</span>
            </div>
            <div className="pt-1 space-y-1">
              <div className="flex justify-between gap-4 text-zinc-100">
                <span className="text-zinc-400">Sales:</span>
                <span className="font-semibold text-zinc-100 tabular-nums">₦{activeHover.totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4 text-zinc-300 text-[11px]">
                <span className="text-zinc-400">Orders:</span>
                <span className="tabular-nums">{activeHover.ordersCount} ({activeHover.successCount} fulfilled)</span>
              </div>
              <div className="flex justify-between gap-4 text-emerald-400 text-[11px] pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Profit:</span>
                <span className="font-semibold tabular-nums">₦{activeHover.netProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 2. DISCO VOLUME & MARKET SHARE (DONUT + BARS)
// ==========================================
interface DiscoDistributionProps {
  discos: DiscoHealth[];
}

const DISCO_COLORS: Record<string, string> = {
  IKEDC: '#007BFF',
  EKEDC: '#00CC66',
  AEDC: '#F59E0B',
  IBEDC: '#8B5CF6',
  EEDC: '#EC4899',
  PHED: '#06B6D4',
  KEDCO: '#10B981',
  KAEDCO: '#6366F1',
  BEDC: '#F97316',
  JED: '#14B8A6',
  YEDC: '#E11D48',
  APLE: '#A855F7'
};

export const DiscoDistributionChart: React.FC<DiscoDistributionProps> = ({ discos }) => {
  const [selectedDisco, setSelectedDisco] = useState<string | null>(null);

  // Sort DISCOs by actual orders recorded in database
  const computedList = useMemo(() => {
    return [...discos].sort((a, b) => b.totalOrders - a.totalOrders);
  }, [discos]);

  const totalAllOrders = computedList.reduce((acc, d) => acc + d.totalOrders, 0);

  // Donut SVG parameters
  const size = 160;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const donutSegments = computedList.slice(0, 6).map((item) => {
    const percent = totalAllOrders > 0 ? (item.totalOrders / totalAllOrders) : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercent * circumference;
    cumulativePercent += percent;
    const color = DISCO_COLORS[item.disco] || '#64748B';

    return {
      ...item,
      percent: Math.round(percent * 100),
      color,
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-colors hover:border-zinc-700/80">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
            <PieIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
              DISCO Market Share
            </h3>
            <p className="text-xs text-zinc-400">
              Vending volume breakdown across power distributors
            </p>
          </div>
        </div>
      </div>

      {/* Scalable Donut Chart & Centered Legend */}
      <div className="flex flex-col justify-between flex-1">
        {/* Donut Visual */}
        <div className="flex flex-col items-center justify-center py-2 relative">
          <div className="relative w-36 h-36">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#27272A"
                strokeWidth={strokeWidth}
              />
              {donutSegments.map((seg) => (
                <circle
                  key={seg.disco}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                  onMouseEnter={() => setSelectedDisco(seg.disco)}
                  onMouseLeave={() => setSelectedDisco(null)}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                {totalAllOrders > 0 ? (selectedDisco ? 'Selected' : 'Top Share') : 'Total'}
              </span>
              <span className="text-xl font-bold text-white tracking-tight">
                {totalAllOrders > 0 ? (selectedDisco || donutSegments[0]?.disco || 'N/A') : '0'}
              </span>
              <span className="text-xs text-zinc-400 font-medium tabular-nums">
                {totalAllOrders > 0
                  ? `${donutSegments.find((s) => s.disco === (selectedDisco || donutSegments[0]?.disco))?.percent || 0}% share`
                  : 'No vends recorded'}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown Ranked List */}
        <div className="space-y-1.5 pt-3 border-t border-zinc-800/80">
          {computedList.slice(0, 5).map((d) => {
            const color = DISCO_COLORS[d.disco] || '#64748B';
            const sharePct = totalAllOrders > 0 ? Math.round((d.totalOrders / totalAllOrders) * 100) : 0;
            const isSelected = selectedDisco === d.disco;

            return (
              <div
                key={d.disco}
                onMouseEnter={() => setSelectedDisco(d.disco)}
                onMouseLeave={() => setSelectedDisco(null)}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  isSelected ? 'bg-zinc-800/80 border border-zinc-700/70' : 'hover:bg-zinc-800/40 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-semibold text-zinc-200">{d.disco}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px]">
                    <span className="text-zinc-400 tabular-nums">{d.totalOrders.toLocaleString()} vends</span>
                    <span className="font-semibold text-white tabular-nums">{sharePct}%</span>
                  </div>
                </div>
                {/* Proportion bar */}
                <div className="w-full h-1 bg-zinc-800/90 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: sharePct > 0 ? `${Math.max(2, sharePct)}%` : '0%',
                      backgroundColor: sharePct > 0 ? color : 'transparent',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. HOURLY PEAK ACTIVITY (24H BAR HISTOGRAM)
// ==========================================
interface HourlyActivityProps {
  orders?: OrderItem[];
}

export const HourlyActivityChart: React.FC<HourlyActivityProps> = ({ orders = [] }) => {
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  // Compute real hourly distribution strictly from database orders
  const hourlyData = useMemo(() => {
    const counts = new Array(24).fill(0);
    for (const o of orders) {
      if (!o.createdAt) continue;
      const h = new Date(o.createdAt).getHours();
      counts[h]++;
    }

    const maxCount = Math.max(...counts, 0);
    const hasAny = counts.some(c => c > 0);

    return counts.map((volume, h) => ({
      hour: h,
      label: `${h.toString().padStart(2, '0')}:00`,
      volume,
      isPeak: hasAny && volume === maxCount && volume > 0
    }));
  }, [orders]);

  const maxVolume = Math.max(...hourlyData.map(h => h.volume), 1);
  const totalHourlyOrders = hourlyData.reduce((sum, h) => sum + h.volume, 0);
  const peakHour = hourlyData.find(h => h.isPeak);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-colors hover:border-zinc-700/80">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-800/80 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight truncate">
              Hourly Purchase Velocity
            </h3>
            <p className="text-xs text-zinc-400 truncate">
              Live traffic distribution across 24-hour cycle • Total: {totalHourlyOrders} orders
            </p>
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 whitespace-nowrap shrink-0">
          {totalHourlyOrders > 0 && peakHour ? `Peak: ${peakHour.label}` : '0 orders in period'}
        </span>
      </div>

      {/* 24 Bar Columns */}
      <div className="h-40 flex items-end justify-between gap-1 pt-4 pb-1 select-none">
        {hourlyData.map((d) => {
          const heightPct = Math.round((d.volume / maxVolume) * 100);
          const isHovered = hoverHour === d.hour;

          return (
            <div
              key={d.hour}
              className="flex-1 h-full flex flex-col items-center justify-end relative group cursor-pointer"
              onMouseEnter={() => setHoverHour(d.hour)}
              onMouseLeave={() => setHoverHour(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-9 z-30 pointer-events-none bg-zinc-950 border border-zinc-800 text-zinc-100 text-[11px] font-mono px-2 py-1 rounded-md shadow-xl whitespace-nowrap">
                  {d.label}: {d.volume} vends
                </div>
              )}

              {/* Bar - Clean Monzo solid tone (no multi-gradient slop) */}
              <div
                className={`w-full rounded-t-[3px] transition-colors duration-150 ${
                  d.isPeak
                    ? isHovered ? 'bg-zinc-200' : 'bg-zinc-300'
                    : isHovered ? 'bg-zinc-700' : 'bg-zinc-800'
                }`}
                style={{ height: `${heightPct}%` }}
              />

              {/* X label every 3 hours */}
              {d.hour % 3 === 0 ? (
                <span className="text-[9px] text-zinc-500 font-mono mt-2">
                  {d.hour.toString().padStart(2, '0')}h
                </span>
              ) : (
                <span className="text-[9px] text-transparent mt-2">.</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 4. PROFIT & MARGIN WATERFALL BREAKDOWN
// ==========================================
interface ProfitBreakdownProps {
  stats: DashboardStats | null;
}

export const ProfitBreakdownChart: React.FC<ProfitBreakdownProps> = ({ stats }) => {
  const kpis = stats?.kpis;
  
  // Real financial figures strictly from live database orders
  const gross = kpis?.totalRevenue || 0;
  const vendCost = kpis?.totalVendAmount || 0;
  const serviceFees = kpis?.totalServiceFees || 0;
  const bpCommission = kpis?.totalBuyPowerCommission || 0;
  const monnifyFees = kpis?.totalMonnifyFees || 0;
  const netProfit = kpis?.netProfit || 0;

  const profitMarginPct = gross > 0 ? ((netProfit / gross) * 100).toFixed(2) : '0.00';

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-colors hover:border-zinc-700/80">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Financial Margin Stack
            </h3>
            <p className="text-xs text-zinc-400">
              Flow of funds from Customer Payment to Net Retained Margin
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-zinc-400 block font-mono uppercase">Net Margin</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 tabular-nums">
            +{profitMarginPct}%
          </span>
        </div>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* Gross customer payment */}
        <div>
          <div className="flex justify-between text-zinc-300 mb-1.5 font-medium">
            <span>Gross Customer Collections (100%)</span>
            <span className="font-semibold text-white tabular-nums font-mono">₦{gross.toLocaleString()}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-400 rounded-full w-full" />
          </div>
        </div>

        {/* Remitted to DISCO */}
        <div>
          <div className="flex justify-between text-zinc-400 mb-1.5">
            <span>DISCO Energy Unit Cost (~98%)</span>
            <span className="text-zinc-300 tabular-nums font-mono">₦{vendCost.toLocaleString()}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${Math.round((vendCost / gross) * 100)}%` }} />
          </div>
        </div>

        {/* Revenue Additions */}
        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-zinc-800/80">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium block">Service Fee Revenue</span>
            <span className="text-base font-semibold text-zinc-100 tabular-nums font-mono mt-0.5 block">+₦{serviceFees.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">₦100 / transaction</span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium block">BuyPower Commission</span>
            <span className="text-base font-semibold text-emerald-400 tabular-nums font-mono mt-0.5 block">+₦{bpCommission.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">1.5% on energy vended</span>
          </div>
        </div>

        {/* Deductions & Net Profit */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-200 block">Net Retained Margin</span>
            <span className="text-[11px] text-zinc-400 font-mono">After Monnify Gateway (1.5% + 7.5% VAT)</span>
          </div>
          <span className="text-lg font-bold text-emerald-400 tabular-nums font-mono">
            ₦{netProfit.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};
