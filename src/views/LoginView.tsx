import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../api';
import { AdminUser } from '../types';
import Logo from '../components/Logo';

interface Props {
  onLoginSuccess: (user: AdminUser) => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email.trim(), password);
      onLoginSuccess(res.admin);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="w-full max-w-[400px] space-y-6 relative z-10">
        
        {/* Brand Header with official Logo */}
        <div className="text-center space-y-2">
          <div className="inline-block hover:opacity-95 transition-opacity mb-1">
            <Logo className="h-9 w-auto text-white mx-auto" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Operations Portal
          </h1>
          <p className="text-xs text-zinc-400">
            Internal operations, fulfillment & financial settlement
          </p>
        </div>

        {/* Modern Login Card */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-7 sm:p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_4px_16px_rgba(0,0,0,0.4)] space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">
                Staff Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@energiease.ng"
                  className="w-full h-10 pl-10 pr-3 rounded-lg bg-zinc-950/80 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-10 pl-10 pr-10 rounded-lg bg-zinc-950/80 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-white transition-colors focus:outline-none p-0.5 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none mt-2 cursor-pointer shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>256-bit Encrypted Session • Authorized Staff Only</span>
          </div>
        </div>

        {/* Environment footer */}
        <div className="text-center text-[11px] text-zinc-500 font-sans">
          Mind Colony Limited • EnergiEase Operations
        </div>

      </div>
    </div>
  );
};
