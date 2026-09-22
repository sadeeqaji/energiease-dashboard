import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Trash2, Mail, Lock, User, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { StaffUser, Role } from '../types';
import { api } from '../api';

export const StaffView: React.FC = () => {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('EnergiEase2026!');
  const [role, setRole] = useState<Role>('support');

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const users = await api.listStaffUsers();
      setStaff(users);
    } catch (err: any) {
      console.error('Failed to load staff accounts:', err);
      setNotification({ type: 'error', text: err.message || 'Failed to load team list' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setNotification({ type: 'error', text: 'All fields are required' });
      return;
    }

    setSubmitting(true);
    setNotification(null);
    try {
      const newUser = await api.createStaffUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      setStaff((prev) => [newUser, ...prev]);
      setNotification({ type: 'success', text: `Staff account created for ${newUser.email} (${newUser.role})` });
      setIsAdding(false);
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('EnergiEase2026!');
      setRole('support');
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to create staff user' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: StaffUser) => {
    if (user.email === 'sadiq@energiease.ng') {
      alert('Primary superadmin account cannot be deleted.');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to revoke staff access for ${user.firstName} ${user.lastName} (${user.email})?`);
    if (!confirmed) return;

    try {
      const res = await api.deleteStaffUser(user.id);
      setStaff((prev) => prev.filter((u) => u.id !== user.id));
      setNotification({ type: 'success', text: res.message || 'Staff access revoked' });
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to revoke staff access' });
    }
  };

  const getRoleBadge = (r: Role) => {
    switch (r) {
      case 'superadmin':
        return 'bg-zinc-100 text-zinc-950 border border-zinc-200 font-semibold';
      case 'accounting':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'support':
        return 'bg-zinc-800 border-zinc-700/60 text-zinc-300';
      case 'admin':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
      default:
        return 'bg-zinc-800 border-zinc-700/60 text-zinc-400';
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Header & Add User Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-zinc-300" />
            <h2 className="text-base font-semibold text-white tracking-tight">
              Staff & Role-Based Access Control (RBAC)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Superadmin provisioning, permission levels, and secure system access control.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStaff}
            disabled={loading}
            className="h-9 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-200' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="h-9 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isAdding ? 'Close Form' : 'Add Staff Member'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Add Staff Form (Collapsible) */}
      {isAdding && (
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="border-b border-zinc-800/80 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-zinc-300" />
              Provision New Staff Account
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Set role privileges. Customer Support accounts will not see provider commission rates.
            </p>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">First Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Amina"
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 focus:outline-none text-xs text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">Last Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Bello"
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 focus:outline-none text-xs text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">Staff Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. amina@energiease.ng"
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 focus:outline-none text-xs text-white placeholder:text-zinc-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">Temporary Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 focus:outline-none text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Role Selector Card */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-zinc-300 block">Assign Staff Role & Privilege Matrix</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Support Role */}
                <div
                  onClick={() => setRole('support')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    role === 'support'
                      ? 'bg-zinc-900 border-zinc-600 text-white shadow-xs'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white">Customer Support</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      SUPPORT
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    View orders, retry vends, resend WhatsApp tokens. <strong>Commission masked.</strong>
                  </p>
                </div>

                {/* Accounting Role */}
                <div
                  onClick={() => setRole('accounting')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    role === 'accounting'
                      ? 'bg-zinc-900 border-emerald-500/60 text-white shadow-xs'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white">Accounting & Finance</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ACCOUNTING
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Financial analytics, BuyPower +1.50% commission, Monnify ledger reconciliation.
                  </p>
                </div>

                {/* Operations Admin */}
                <div
                  onClick={() => setRole('admin')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    role === 'admin'
                      ? 'bg-zinc-900 border-zinc-500 text-white shadow-xs'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white">Operations Admin</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                      ADMIN
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Full day-to-day order management, telemetry diagnostics, and financial visibility.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="h-9 px-4 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {submitting ? 'Creating Account...' : 'Confirm & Create Staff'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff Directory Table */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
          <div className="text-xs text-zinc-300 font-medium">
            Active Staff Accounts ({staff.length})
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            Protected by Superadmin RBAC
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-zinc-400 text-[11px] font-medium">
                <th className="py-2.5 px-4 font-normal">Staff Name</th>
                <th className="py-2.5 px-4 font-normal">Email Address</th>
                <th className="py-2.5 px-4 font-normal">Assigned Role</th>
                <th className="py-2.5 px-4 font-normal">Commission Access</th>
                <th className="py-2.5 px-4 font-normal">Permissions Granted</th>
                <th className="py-2.5 px-4 font-normal">Date Created</th>
                <th className="py-2.5 px-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {staff.map((u) => {
                const canSeeCommission = u.role === 'superadmin' || u.role === 'admin' || u.role === 'accounting';
                const isPrimary = u.email === 'sadiq@energiease.ng';

                return (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors h-12">
                    <td className="py-2 px-4 text-white font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0 font-mono">
                          {u.firstName?.[0]?.toUpperCase()}{u.lastName?.[0]?.toUpperCase()}
                        </div>
                        <span>{u.firstName} {u.lastName}</span>
                        {isPrimary && (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                            Founder
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-zinc-300 whitespace-nowrap font-mono">
                      {u.email}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium border ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      {canSeeCommission ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Visible (+1.5%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                          Masked (Restricted)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap text-[11px] text-zinc-400">
                      {u.permissions?.length > 0 ? (
                        <span>{u.permissions.length} capabilities</span>
                      ) : (
                        <span>Default Role Policy</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-zinc-400 whitespace-nowrap tabular-nums font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap">
                      {!isPrimary && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          title="Revoke Access"
                          className="p-1.5 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {staff.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 text-xs">
                    {loading ? 'Loading staff roster...' : 'No staff accounts found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default StaffView;
