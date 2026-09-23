import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, Copy, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { OrderItem, AdminUser } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../api';

interface Props {
  onSelectOrder: (order: OrderItem) => void;
  user?: AdminUser | null;
}

export const SupportView: React.FC<Props> = ({ onSelectOrder, user }) => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const canSeeCommission = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'accounting';
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [discoFilter, setDiscoFilter] = useState('all');
  const [interventionOnly, setInterventionOnly] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        disco: discoFilter !== 'all' ? discoFilter : undefined,
        interventionOnly: interventionOnly || undefined,
      });
      setOrders(res.orders);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, discoFilter, interventionOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleCopyToken = (e: React.MouseEvent, token?: string, id?: string) => {
    e.stopPropagation();
    if (!token || !id) return;
    navigator.clipboard.writeText(token.replace(/\D/g, ''));
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const formatShortToken = (token?: string) => {
    if (!token) return '—';
    const clean = token.replace(/\D/g, '');
    if (clean.length === 20) {
      return `${clean.slice(0, 4)}-${clean.slice(4, 8)}...${clean.slice(16)}`;
    }
    return token.slice(0, 10);
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Top Controls: Search & Filters */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by phone, meter number, or transaction reference..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 focus:outline-none text-xs text-zinc-100 placeholder:text-zinc-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            Search
          </button>
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="h-9 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-200' : ''}`} />
          </button>
        </form>

        {/* Filter Badges, Commission Visibility & DISCO Select */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-zinc-400 text-[11px] uppercase font-medium mr-1 tracking-wider">Filter:</span>
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'success', label: 'Success' },
              { id: 'processing', label: 'Processing' },
              { id: 'failed', label: 'Failed' },
              { id: 'expired', label: 'Expired' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setStatusFilter(f.id);
                  setInterventionOnly(false);
                  setPage(1);
                }}
                className={`px-2.5 h-7 rounded-md text-xs transition-colors border cursor-pointer ${
                  statusFilter === f.id && !interventionOnly
                    ? 'bg-zinc-800 border-zinc-700 text-white font-medium shadow-xs'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700/60'
                }`}
              >
                {f.label}
              </button>
            ))}

            {/* Requires Intervention Filter */}
            <button
              onClick={() => {
                setInterventionOnly(!interventionOnly);
                setStatusFilter('all');
                setPage(1);
              }}
              className={`px-2.5 h-7 rounded-md text-xs transition-colors border flex items-center gap-1.5 cursor-pointer ${
                interventionOnly
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-medium'
                  : 'bg-zinc-950/60 border-zinc-800/80 text-rose-400/90 hover:border-rose-500/30'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Needs Attention</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-[11px] uppercase font-medium tracking-wider">DISCO:</span>
              <select
                value={discoFilter}
                onChange={(e) => {
                  setDiscoFilter(e.target.value);
                  setPage(1);
                }}
                className="h-7 px-2 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
              >
                <option value="all">All DISCOs</option>
                {['IKEDC', 'EKEDC', 'AEDC', 'IBEDC', 'EEDC', 'PHED', 'KAEDCO', 'KEDCO', 'BEDC', 'YEDC', 'APLE'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table - Modernized with BP Commission Column */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200 font-mono tabular-nums">{total}</span> total transactions
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            Page {page} of {Math.max(totalPages, 1)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-zinc-400 text-[11px] font-medium">
                <th className="py-2.5 px-3.5 font-normal">Reference</th>
                <th className="py-2.5 px-3.5 font-normal">Customer</th>
                <th className="py-2.5 px-3.5 font-normal">Meter Number</th>
                <th className="py-2.5 px-3.5 font-normal">DISCO</th>
                <th className="py-2.5 px-3.5 font-normal">Amount</th>
                {canSeeCommission && (
                  <th className="py-2.5 px-3.5 font-normal text-emerald-400">BP Comm (1.5%)</th>
                )}
                <th className="py-2.5 px-3.5 font-normal">Token</th>
                <th className="py-2.5 px-3.5 font-normal">Status</th>
                <th className="py-2.5 px-3.5 font-normal">Date & Time</th>
                <th className="py-2.5 px-3.5 font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => onSelectOrder(o)}
                  className={`hover:bg-zinc-800/40 transition-colors cursor-pointer h-11 ${
                    o.requiresManualIntervention ? 'bg-rose-500/5' : ''
                  }`}
                >
                  <td className="py-2 px-3.5 font-mono font-medium text-zinc-200 text-xs whitespace-nowrap">
                    {o.reference}
                  </td>
                  <td className="py-2 px-3.5 text-zinc-300 whitespace-nowrap font-mono">
                    {o.customerPhone}
                  </td>
                  <td className="py-2 px-3.5 text-zinc-300 whitespace-nowrap font-mono">
                    {o.meterNumber}
                  </td>
                  <td className="py-2 px-3.5 text-zinc-400 whitespace-nowrap font-medium">
                    {o.disco}
                  </td>
                  <td className="py-2 px-3.5 font-medium text-white tabular-nums whitespace-nowrap font-mono">
                    ₦{o.amount.toLocaleString()}
                  </td>
                  {/* BuyPower Commission Column - Restricted to Accounting & Superadmin */}
                  {canSeeCommission && (
                    <td className="py-2 px-3.5 font-medium text-emerald-400 tabular-nums whitespace-nowrap font-mono">
                      +₦{(o.buypowerCommission ?? (o.vendAmount * 0.015)).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}
                  <td className="py-2 px-3.5 text-emerald-400 font-mono font-medium whitespace-nowrap">
                    {o.token ? (
                      <button
                        onClick={(e) => handleCopyToken(e, o.token, o.id)}
                        className="inline-flex items-center gap-1 hover:text-emerald-300 cursor-pointer"
                        title="Copy full 20-digit token"
                      >
                        <span>{formatShortToken(o.token)}</span>
                        {copiedTokenId === o.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-zinc-500" />
                        )}
                      </button>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3.5 whitespace-nowrap">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-2 px-3.5 text-zinc-400 whitespace-nowrap tabular-nums font-mono text-[11px]">
                    {new Date(o.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-2 px-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(o);
                      }}
                      className="px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-xs font-medium cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={canSeeCommission ? 10 : 9} className="py-12 text-center text-zinc-500 text-xs">
                    {loading ? 'Fetching transactions...' : 'No transactions match current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Showing <span className="text-zinc-200 font-mono">{orders.length}</span> of <span className="text-zinc-200 font-mono">{total}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs text-zinc-400 font-mono px-1">
              {page} / {Math.max(totalPages, 1)}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SupportView;
