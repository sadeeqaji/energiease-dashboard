import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Send, 
  RotateCw, 
  FileText, 
  AlertCircle, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight,
  ExternalLink,
  ReceiptText
} from 'lucide-react';
import { OrderItem, AdminUser } from '../types';
import { StatusBadge } from './StatusBadge';
import { api } from '../api';

interface Props {
  order: OrderItem | null;
  user?: AdminUser | null;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export const OrderDrawer: React.FC<Props> = ({ order, user, onClose, onOrderUpdated }) => {
  const [currentOrder, setCurrentOrder] = useState<OrderItem | null>(order);
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [resending, setResending] = useState(false);
  const [requerying, setRequerying] = useState(false);
  const [verifyingMonnify, setVerifyingMonnify] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [monnifyData, setMonnifyData] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setCurrentOrder(order);
    setActionMessage(null);
    setMonnifyData(null);

    if (order?.reference) {
      api.getOrderDetail(order.reference).then((fresh) => {
        if (fresh) {
          setCurrentOrder((prev) => ({
            ...prev,
            ...fresh,
            token: fresh.token || fresh.details?.token || fresh.providerResponse?.token,
            units: fresh.units || fresh.details?.units || fresh.providerResponse?.units,
            disco: fresh.disco || fresh.details?.disco,
            meterNumber: fresh.meterNumber || fresh.details?.meterNumber,
            meterName: fresh.meterName || fresh.details?.meterName || fresh.details?.name,
          }));
        }
      }).catch(() => {});
    }
  }, [order?.reference]);

  if (!currentOrder) return null;

  const rawToken = currentOrder.token || (currentOrder as any).providerResponse?.token || (currentOrder as any).details?.token;
  const rawUnits = currentOrder.units || (currentOrder as any).providerResponse?.units || (currentOrder as any).details?.units;

  const handleCopyToken = () => {
    if (!rawToken) return;
    navigator.clipboard.writeText(rawToken.replace(/\D/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetryVend = async () => {
    setRetrying(true);
    setActionMessage(null);
    try {
      const res = await api.retryVend(currentOrder.reference);
      setActionMessage({ type: res.success ? 'success' : 'error', text: res.message });
      const fresh = await api.getOrderDetail(currentOrder.reference).catch(() => null);
      if (fresh) {
        setCurrentOrder((prev) => ({
          ...prev,
          ...fresh,
          token: fresh.token || fresh.details?.token || fresh.providerResponse?.token,
          units: fresh.units || fresh.details?.units || fresh.providerResponse?.units,
        }));
      }
      if (res.success && onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Retry failed' });
    } finally {
      setRetrying(false);
    }
  };

  const handleRequeryBuyPower = async () => {
    setRequerying(true);
    setActionMessage(null);
    try {
      const res = await api.requeryBuyPower(currentOrder.reference);
      setActionMessage({ type: res.success ? 'success' : 'error', text: res.message });
      const fresh = await api.getOrderDetail(currentOrder.reference).catch(() => null);
      if (fresh) {
        setCurrentOrder((prev) => ({
          ...prev,
          ...fresh,
          token: fresh.token || fresh.details?.token || fresh.providerResponse?.token,
          units: fresh.units || fresh.details?.units || fresh.providerResponse?.units,
        }));
      }
      if (res.updated && onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'BuyPower re-query failed' });
    } finally {
      setRequerying(false);
    }
  };

  const handleVerifyMonnify = async () => {
    setVerifyingMonnify(true);
    setActionMessage(null);
    try {
      const res = await api.verifyMonnify(currentOrder.reference);
      setMonnifyData(res.monnify);
      setActionMessage({ type: 'success', text: `Monnify verified: ${res.monnify?.paymentStatus} (Fee: ₦${res.monnify?.fee || 0})` });
      if (res.updated && onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Monnify payment verification failed' });
    } finally {
      setVerifyingMonnify(false);
    }
  };

  const handleInitiateRefund = async () => {
    const reason = window.prompt('Enter reason for issuing customer refund:');
    if (!reason) return;

    setRefunding(true);
    setActionMessage(null);
    try {
      const res = await api.refundOrder(currentOrder.reference, reason);
      setActionMessage({ type: 'success', text: res.message });
      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Refund failed' });
    } finally {
      setRefunding(false);
    }
  };

  const handleResendWhatsApp = async () => {
    setResending(true);
    setActionMessage(null);
    try {
      const res = await api.resendToken(currentOrder.reference);
      setActionMessage({ type: 'success', text: res.message });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to resend token' });
    } finally {
      setResending(false);
    }
  };

  const formatTokenGroups = (raw?: string) => {
    if (!raw) return null;
    const clean = raw.replace(/\D/g, '');
    if (clean.length === 20) {
      return clean.match(/.{1,4}/g) || [clean];
    }
    return [raw];
  };

  const tokenGroups = formatTokenGroups(rawToken);
  const bpComm = currentOrder.buypowerCommission ?? (currentOrder.vendAmount * 0.015);
  const canSeeCommission = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'accounting';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200" 
        onClick={onClose} 
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-lg bg-zinc-950 border-l border-zinc-800/80 h-full flex flex-col justify-between overflow-hidden text-zinc-100 shadow-2xl z-10">
        
        {/* Header - Crisp Monzo/Stripe Navigation */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-zinc-300 tracking-wide">
                {currentOrder.reference}
              </span>
              <StatusBadge status={currentOrder.status} size="sm" />
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Processed on {new Date(currentOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(currentOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          
          {/* Action Notification Banner */}
          {actionMessage && (
            <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {actionMessage.type === 'success' ? (
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span className="leading-relaxed">{actionMessage.text}</span>
            </div>
          )}

          {/* Electricity Token Section - Stripe Card Style */}
          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-zinc-300">Electricity Token</span>
                <span className="text-[10px] text-zinc-400 font-mono">STS Standard</span>
              </div>
              {rawToken && (
                <button
                  onClick={handleCopyToken}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-zinc-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Token Digits Box */}
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              {tokenGroups ? (
                <div className="flex items-center gap-2 font-mono text-base font-semibold text-emerald-400 tracking-wider select-all">
                  {tokenGroups.map((grp, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-zinc-600 select-none">·</span>}
                      <span>{grp}</span>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <span className="font-mono text-xs text-zinc-500">Token unavailable (Pending or failed)</span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5 text-zinc-400">
              <span>Units credited</span>
              <span className="text-zinc-200 font-medium font-mono tabular-nums">
                {rawUnits ? `${rawUnits} kWh` : '—'}
              </span>
            </div>
          </div>

          {/* Failure Diagnostics if flagged (only if not success) */}
          {currentOrder.status !== 'success' && (currentOrder.requiresManualIntervention || currentOrder.status === 'failed' || currentOrder.fulfillmentFailureReason) && (
            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Provider Delivery Issue</span>
              </div>
              <p className="text-xs text-rose-300/90 leading-relaxed break-words">
                {currentOrder.fulfillmentFailureReason || 'The upstream vending service could not generate a token. You can retry or verify provider balance.'}
              </p>
            </div>
          )}

          {/* Customer & Meter Details - Clean Key-Value List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Customer & Meter
            </h3>
            
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 divide-y divide-zinc-800/60 text-xs">
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Customer Phone</span>
                <span className="text-zinc-200 font-mono">{currentOrder.customerPhone}</span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Electricity Provider</span>
                <span className="text-zinc-200 font-medium">{currentOrder.disco}</span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Meter Number</span>
                <span className="text-zinc-200 font-mono font-medium">{currentOrder.meterNumber}</span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Account Name</span>
                <span className="text-zinc-300 truncate max-w-[220px] text-right">
                  {currentOrder.meterName || 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-zinc-400">Fulfillment Gateway</span>
                <span className="text-zinc-300 uppercase font-mono text-[11px]">
                  {currentOrder.provider || 'BUYPOWER'}
                </span>
              </div>
            </div>
          </div>

          {/* Monnify Verified Audit Record (if queried) */}
          {monnifyData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Monnify Gateway Record
                </h3>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {monnifyData.paymentStatus}
                </span>
              </div>
              
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 divide-y divide-zinc-800/60 text-xs font-mono">
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-zinc-400 font-sans">Amount Paid</span>
                  <span className="text-zinc-200 tabular-nums">₦{(monnifyData.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-zinc-400 font-sans">Monnify Fee</span>
                  <span className="text-zinc-400 tabular-nums">-₦{(monnifyData.fee || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-zinc-400 font-sans">Settlement Value</span>
                  <span className="text-emerald-400 font-semibold tabular-nums">₦{(monnifyData.settlementAmount || 0).toLocaleString()}</span>
                </div>
                {monnifyData.transactionReference && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 text-[11px]">
                    <span className="text-zinc-500 font-sans">Reference</span>
                    <span className="text-zinc-400 truncate max-w-[200px]">{monnifyData.transactionReference}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financial Breakdown - Stripe Style */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {canSeeCommission ? 'Settlement Breakdown' : 'Payment Summary'}
              </h3>
              {canSeeCommission && (
                <span className="text-[11px] font-mono text-zinc-400">1.5% BP · 1.61% MNFY</span>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Customer paid</span>
                <span className="text-zinc-100 font-semibold font-mono tabular-nums">
                  ₦{currentOrder.amount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span>DISCO electricity cost</span>
                <span className="font-mono tabular-nums">₦{currentOrder.vendAmount.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span>Service fee (EnergiEase)</span>
                <span className="font-mono tabular-nums">+₦{currentOrder.serviceFee.toLocaleString()}</span>
              </div>

              {canSeeCommission && (
                <>
                  <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="text-zinc-400">BuyPower commission (1.50%)</span>
                      <span className="font-mono text-emerald-400 tabular-nums">
                        +₦{bpComm.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="text-zinc-400">Monnify gateway fee (1.6125%)</span>
                      <span className="font-mono text-zinc-400 tabular-nums">
                        -₦{(currentOrder.monnifyFee ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-200 font-medium">Net margin</span>
                    <span className="text-sm font-semibold font-mono text-emerald-400 tabular-nums">
                      ₦{(currentOrder.netProfit ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions - Monzo/Stripe Clean Bar */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 space-y-2.5 shrink-0">
          
          {/* Diagnostic utilities row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleRequeryBuyPower}
              disabled={requerying}
              className="h-8.5 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800/90 text-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 text-zinc-400 ${requerying ? 'animate-spin text-zinc-200' : ''}`} />
              <span>{requerying ? 'Pinging BuyPower...' : 'BuyPower Re-Query'}</span>
            </button>

            <button
              onClick={handleVerifyMonnify}
              disabled={verifyingMonnify}
              className="h-8.5 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800/90 text-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className={`w-3.5 h-3.5 text-zinc-400 ${verifyingMonnify ? 'animate-spin text-zinc-200' : ''}`} />
              <span>{verifyingMonnify ? 'Verifying...' : 'Verify Monnify'}</span>
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleRetryVend}
              disabled={retrying || currentOrder.status === 'success'}
              className="h-9 px-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:border-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Retrying...' : 'Retry Vend'}</span>
            </button>

            <button
              onClick={handleResendWhatsApp}
              disabled={resending || !rawToken}
              className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-900 disabled:border disabled:border-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Send className={`w-3.5 h-3.5 ${resending ? 'animate-pulse' : ''}`} />
              <span>{resending ? 'Sending...' : 'Resend to WhatsApp'}</span>
            </button>
          </div>

          {/* Secondary Actions: Refund + PDF */}
          <div className="flex items-center gap-2 pt-0.5">
            {(currentOrder.requiresManualIntervention || currentOrder.status === 'failed') && (
              <button
                onClick={handleInitiateRefund}
                disabled={refunding}
                className="h-8.5 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <span>{refunding ? 'Refunding...' : 'Issue Refund'}</span>
              </button>
            )}

            <a
              href={api.getReceiptUrl(currentOrder.reference)}
              target="_blank"
              rel="noreferrer"
              className="h-8.5 flex-1 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Official Receipt (PDF)</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderDrawer;
