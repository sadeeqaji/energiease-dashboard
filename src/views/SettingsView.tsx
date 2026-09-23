import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Zap, 
  Layers, 
  Activity
} from 'lucide-react';
import { AdminUser, PaymentGatewayConfig } from '../types';
import { api } from '../api';

interface Props {
  user: AdminUser;
}

type GatewayName = 'BuyPowerMFB' | 'Monnify' | 'Paystack';

interface GatewayMeta {
  id: GatewayName;
  name: string;
  tagline: string;
  description: string;
  settlementType: string;
  badgeColor: string;
}

const GATEWAYS: Record<GatewayName, GatewayMeta> = {
  BuyPowerMFB: {
    id: 'BuyPowerMFB',
    name: 'BuyPower MFB',
    tagline: 'Dedicated & Dynamic Virtual Accounts',
    description: 'Instant 10-digit invoice accounts via BuyPower Microfinance Bank v2 OpenAPI with real-time webhook confirmation.',
    settlementType: 'Direct Settlement',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  },
  Monnify: {
    id: 'Monnify',
    name: 'Monnify (Moniepoint MFB)',
    tagline: 'Reserved & Dynamic Virtual Accounts',
    description: 'Direct bank transfer checkout with instant webhook notifications and high reliability across Nigerian banks.',
    settlementType: 'Sub-account Settlement',
    badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
  },
  Paystack: {
    id: 'Paystack',
    name: 'Paystack',
    tagline: 'Dedicated Virtual Accounts & Checkout',
    description: 'High-availability card and dedicated virtual account infrastructure for automated electricity billing.',
    settlementType: 'Standard Settlement',
    badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
  },
};

export const SettingsView: React.FC<Props> = ({ user: _user }) => {
  const [config, setConfig] = useState<PaymentGatewayConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingGateway, setUpdatingGateway] = useState<GatewayName | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getPaymentGatewayConfig();
      setConfig(data);
    } catch (err: any) {
      console.error('Failed to load payment gateway config:', err);
      setNotification({ type: 'error', text: err.message || 'Failed to load gateway configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSwitchGateway = async (targetGateway: GatewayName) => {
    if (config?.activeGateway === targetGateway) return;

    setUpdatingGateway(targetGateway);
    setNotification(null);
    try {
      const res = await api.updatePaymentGatewayConfig(targetGateway);
      setConfig({
        activeGateway: res.activeGateway,
        availableGateways: res.availableGateways,
        fallbackOrder: res.fallbackOrder,
      });
      setNotification({
        type: 'success',
        text: res.message || `Switched primary gateway to ${GATEWAYS[targetGateway]?.name || targetGateway} with zero downtime.`,
      });
    } catch (err: any) {
      console.error('Failed to update primary gateway:', err);
      setNotification({ type: 'error', text: err.message || 'Failed to switch payment gateway' });
    } finally {
      setUpdatingGateway(null);
    }
  };

  const activeGateway = config?.activeGateway || 'BuyPowerMFB';
  const fallbackOrder = config?.fallbackOrder || ['BuyPowerMFB', 'Monnify', 'Paystack'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">System Settings</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Routing
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Configure primary payment gateway routing and zero-downtime failover cascades for all electricity token purchases.
          </p>
        </div>

        <button
          onClick={fetchConfig}
          disabled={loading || !!updatingGateway}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border text-sm transition-all duration-150 ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium">{notification.text}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Zero Downtime Guarantee Callout */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-zinc-900/50 to-zinc-900/40 border border-emerald-500/20 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Instant 1-Click Zero Downtime Switching</h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              Gateway selection is synchronized directly across high-performance Redis instances. Changing the primary gateway takes immediate effect for all new checkouts without restarting the server. In-flight payments and webhooks across all providers remain live 24/7.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs">
              <span className="text-zinc-400">Current Primary:</span>{' '}
              <span className="font-semibold text-emerald-400">{GATEWAYS[activeGateway]?.name || activeGateway}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            Available Payment Gateways
          </h2>
          <span className="text-xs text-zinc-500">1-click to set primary</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['BuyPowerMFB', 'Monnify', 'Paystack'] as GatewayName[]).map((gatewayId) => {
            const meta = GATEWAYS[gatewayId];
            const isPrimary = activeGateway === gatewayId;
            const isSwitching = updatingGateway === gatewayId;
            const fallbackIdx = fallbackOrder.indexOf(gatewayId);

            return (
              <div
                key={gatewayId}
                className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                  isPrimary
                    ? 'bg-zinc-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  {/* Top Bar with Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {meta.settlementType}
                    </span>
                    {isPrimary ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active Primary
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        Priority #{fallbackIdx + 1}
                      </span>
                    )}
                  </div>

                  {/* Gateway Title */}
                  <h3 className="text-base font-bold text-white tracking-tight">{meta.name}</h3>
                  <p className="text-xs font-medium text-emerald-400/90 mt-0.5">{meta.tagline}</p>

                  <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed min-h-[48px]">
                    {meta.description}
                  </p>
                </div>

                {/* Bottom Action Area */}
                <div className="mt-5 pt-4 border-t border-zinc-800/80">
                  {isPrimary ? (
                    <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Active for All Checkouts
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSwitchGateway(gatewayId)}
                      disabled={loading || !!updatingGateway}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {isSwitching ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Switching...</span>
                        </>
                      ) : (
                        <>
                          <span>Set as Primary</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fallback & Routing Cascade Order */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Live Automated Failover Cascade</h2>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          If the primary gateway times out or encounters unexpected upstream bank disruption, the customer&apos;s checkout request automatically cascades in this order without customer friction:
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {fallbackOrder.map((gw, idx) => {
            const meta = GATEWAYS[gw];
            const isFirst = idx === 0;
            return (
              <React.Fragment key={gw}>
                <div
                  className={`flex-1 flex items-center gap-3 p-3.5 rounded-lg border ${
                    isFirst
                      ? 'bg-emerald-950/30 border-emerald-500/30'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isFirst
                        ? 'bg-emerald-500 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${isFirst ? 'text-emerald-400' : 'text-zinc-200'}`}>
                      {meta?.name || gw}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {isFirst ? 'Primary Provider' : `Failover #${idx}`}
                    </p>
                  </div>
                </div>
                {idx < fallbackOrder.length - 1 && (
                  <div className="hidden sm:flex items-center justify-center shrink-0">
                    <ArrowRight className="w-4 h-4 text-zinc-600" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Webhook Coexistence Assurance */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">24/7 Multi-Gateway Webhook Ingestion</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs">
            <div className="flex items-center justify-between text-zinc-300 font-medium">
              <span>BuyPower MFB Webhook</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <code className="block mt-1 text-[11px] text-zinc-500 truncate">/webhooks/buypower-mfb</code>
            <p className="text-[11px] text-zinc-400 mt-1">HMAC-SHA256 Signed &bull; Topic: collections</p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs">
            <div className="flex items-center justify-between text-zinc-300 font-medium">
              <span>Monnify Webhook</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <code className="block mt-1 text-[11px] text-zinc-500 truncate">/webhooks/monnify</code>
            <p className="text-[11px] text-zinc-400 mt-1">SHA512 Signature &bull; Moniepoint Ingestion</p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs">
            <div className="flex items-center justify-between text-zinc-300 font-medium">
              <span>Paystack Webhook</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <code className="block mt-1 text-[11px] text-zinc-500 truncate">/webhooks/paystack</code>
            <p className="text-[11px] text-zinc-400 mt-1">HMAC-SHA512 &bull; Dedicated Virtual Accts</p>
          </div>
        </div>
      </div>
    </div>
  );
};
