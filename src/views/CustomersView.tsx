import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, Zap, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Customer } from '../types';
import { api } from '../api';

interface Props {
  onSearchCustomerOrders: (phone: string) => void;
}

export const CustomersView: React.FC<Props> = ({ onSearchCustomerOrders }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers({
        search: search.trim() || undefined,
        limit: 50,
      });
      setCustomers(res.customers);
      setTotal(res.pagination.total);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Search Header */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between gap-3 shadow-xs">
        <form onSubmit={handleSearch} className="flex items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer phone or account name..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 focus:outline-none text-xs text-zinc-100 placeholder:text-zinc-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            Search
          </button>
        </form>

        <button
          onClick={fetchCustomers}
          disabled={loading}
          className="h-9 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-200' : ''}`} />
        </button>
      </div>

      {/* Customers List */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Registered Accounts & Saved Meters ({total})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {customers.map((c) => (
            <div key={c.id} className="p-4.5 hover:bg-zinc-800/20 transition-colors space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    {c.name}
                    <span className="text-xs text-zinc-400 font-mono font-normal">({c.phoneNumber})</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                    ID: {c.id} • Joined: {new Date(c.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px] font-medium uppercase tracking-wider">Total Orders</span>
                    <span className="text-white font-semibold font-mono tabular-nums">{c.totalOrders}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] font-medium uppercase tracking-wider">Lifetime Spend</span>
                    <span className="text-emerald-400 font-semibold font-mono tabular-nums">₦{c.totalSpent.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => onSearchCustomerOrders(c.phoneNumber)}
                    className="h-7 px-2.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>View Orders</span>
                    <ArrowUpRight className="w-3 h-3 text-zinc-500" />
                  </button>
                </div>
              </div>

              {/* Meters Pill List */}
              {c.meters && c.meters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                  {c.meters.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200 flex items-center gap-1.5 font-mono">
                          <Zap className="w-3 h-3 text-zinc-400" />
                          {m.meterNumber}
                        </span>
                        <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                          {m.disco}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {m.name || 'Unnamed Meter'}
                      </div>
                      {m.address && (
                        <div className="text-[10px] text-zinc-500 truncate">
                          {m.address}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 italic">
                  No saved meters recorded.
                </div>
              )}
            </div>
          ))}

          {customers.length === 0 && (
            <div className="py-12 text-center text-zinc-500 text-xs">
              {loading ? 'Fetching customers...' : 'No customers found.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CustomersView;
