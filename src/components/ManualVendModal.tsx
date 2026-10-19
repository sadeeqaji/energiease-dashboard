import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  User, 
  MapPin, 
  Link as LinkIcon, 
  Send,
  Download,
  RotateCw,
  BookmarkPlus,
  Landmark,
  Building2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api';
import { MeterVerificationResult, DirectVendResult, PaymentLinkResult } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefillMeter?: string;
  prefillDisco?: string;
  prefillPhone?: string;
}

const DISCOS = [
  { code: 'AEDC', name: 'Abuja Electricity (AEDC)' },
  { code: 'EKEDC', name: 'Eko Electricity (EKEDC)' },
  { code: 'IKEDC', name: 'Ikeja Electric (IKEDC)' },
  { code: 'IBEDC', name: 'Ibadan Electricity (IBEDC)' },
  { code: 'KEDCO', name: 'Kano Electricity (KEDCO)' },
  { code: 'JED', name: 'Jos Electricity (JED)' },
  { code: 'KAEDCO', name: 'Kaduna Electric (KAEDCO)' },
  { code: 'EEDC', name: 'Enugu Electricity (EEDC)' },
  { code: 'BEDC', name: 'Benin Electricity (BEDC)' },
  { code: 'PHED', name: 'Port Harcourt Electricity (PHED)' },
  { code: 'YEDC', name: 'Yola Electricity (YEDC)' },
  { code: 'ABA', name: 'Aba Power (ABA)' },
];

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000];

export const ManualVendModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  prefillMeter = '',
  prefillDisco = 'AEDC',
  prefillPhone = '',
}) => {
  // Step 1: Verification Form
  const [meterNumber, setMeterNumber] = useState(prefillMeter);
  const [disco, setDisco] = useState(prefillDisco);
  const [vendType, setVendType] = useState<'PREPAID' | 'POSTPAID'>('PREPAID');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<MeterVerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Step 2: Action Mode
  // 'direct_vend': Customer paid manually to bank -> Vend token immediately
  // 'payment_link': Customer needs payment link -> Send link/account to WhatsApp
  // 'save_only': Just add meter to customer profile
  const [actionMode, setActionMode] = useState<'direct_vend' | 'payment_link' | 'save_only'>('direct_vend');
  
  const [customerPhone, setCustomerPhone] = useState(prefillPhone);
  const [amount, setAmount] = useState<number | string>(1000);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [customerEmail, setCustomerEmail] = useState('');

  // Processing & Result State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  
  // Results
  const [vendResult, setVendResult] = useState<DirectVendResult | null>(null);
  const [linkResult, setLinkResult] = useState<PaymentLinkResult | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [accountCopied, setAccountCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanMeter = meterNumber.trim();
    if (!cleanMeter) {
      setVerificationError('Please enter a meter number.');
      return;
    }

    setVerifying(true);
    setVerificationError(null);
    setSubmitError(null);
    setVerificationResult(null);

    try {
      const res = await api.verifyMeter({
        meterNumber: cleanMeter,
        disco,
        vendType,
      });

      if (res && res.name) {
        setVerificationResult(res);
        if (res.minVendAmount && Number(amount) < res.minVendAmount) {
          setAmount(res.minVendAmount);
        }
      } else {
        throw new Error('Meter verification returned no details. Please check meter number and disco.');
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Failed to verify meter. Please double-check the meter number and provider.');
    } finally {
      setVerifying(false);
    }
  };

  // Option 1: Direct Automatic Vend (Customer paid manually to our Bank)
  const handleDirectVend = async () => {
    const cleanPhone = customerPhone.trim();
    const vendAmount = Number(amount);

    if (!cleanPhone) {
      setSubmitError('Customer phone number is required to deliver receipt & token.');
      return;
    }
    if (isNaN(vendAmount) || vendAmount < 100) {
      setSubmitError('Minimum vend amount is ₦100.');
      return;
    }
    if (verificationResult?.minVendAmount && vendAmount < verificationResult.minVendAmount) {
      setSubmitError(`Selected disco requires a minimum vend amount of ₦${verificationResult.minVendAmount.toLocaleString()}.`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await api.directVend({
        meterNumber: verificationResult?.meterNumber || meterNumber.trim(),
        disco: verificationResult?.disco || disco,
        vendType: verificationResult?.vendType || vendType,
        amount: vendAmount,
        customerPhone: cleanPhone,
        customerName: verificationResult?.name,
        customerEmail: customerEmail.trim() || undefined,
        notifyWhatsApp,
      });

      setVendResult(result);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitError(err.message || 'Vending transaction failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Option 2: Generate & Send Payment Link / Dedicated Virtual Account
  const handleCreatePaymentLink = async () => {
    const cleanPhone = customerPhone.trim();
    const vendAmount = Number(amount);

    if (!cleanPhone) {
      setSubmitError('Customer WhatsApp phone number is required to send payment link.');
      return;
    }
    if (isNaN(vendAmount) || vendAmount < 100) {
      setSubmitError('Minimum vend amount is ₦100.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await api.createPaymentLink({
        meterNumber: verificationResult?.meterNumber || meterNumber.trim(),
        disco: verificationResult?.disco || disco,
        vendType: verificationResult?.vendType || vendType,
        amount: vendAmount,
        customerPhone: cleanPhone,
        customerName: verificationResult?.name,
        customerEmail: customerEmail.trim() || undefined,
        sendWhatsApp: notifyWhatsApp,
      });

      setLinkResult(result);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create payment link.');
    } finally {
      setSubmitting(false);
    }
  };

  // Option 3: Save Meter to Customer Profile Only
  const handleSaveMeterOnly = async () => {
    if (!customerPhone.trim()) {
      setSubmitError('Customer phone number is required to save a meter to their account.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.saveMeter({
        meterNumber: verificationResult?.meterNumber || meterNumber.trim(),
        disco: verificationResult?.disco || disco,
        vendType: verificationResult?.vendType || vendType,
        phoneNumber: customerPhone.trim(),
        name: verificationResult?.name,
        address: verificationResult?.address,
      });

      setSaveSuccessMessage(`Meter ${meterNumber} saved successfully for ${customerPhone}!`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1600);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save meter.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyToken = () => {
    if (!vendResult?.token) return;
    navigator.clipboard.writeText(vendResult.token.replace(/\s+/g, ''));
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleCopyAccount = () => {
    if (!linkResult?.bankTransferDetails?.accountNumber) return;
    navigator.clipboard.writeText(linkResult.bankTransferDetails.accountNumber.trim());
    setAccountCopied(true);
    setTimeout(() => setAccountCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!linkResult?.paymentUrl) return;
    navigator.clipboard.writeText(linkResult.paymentUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleReset = () => {
    setVerificationResult(null);
    setVendResult(null);
    setLinkResult(null);
    setVerificationError(null);
    setSubmitError(null);
    setSaveSuccessMessage(null);
    setMeterNumber('');
    setCustomerPhone('');
    setAmount(1000);
  };

  const formatTokenDisplay = (tokenStr?: string) => {
    if (!tokenStr) return 'N/A';
    const digitsOnly = tokenStr.replace(/\D/g, '');
    if (digitsOnly.length === 20) {
      return digitsOnly.replace(/(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 - $2 - $3 - $4 - $5');
    }
    return tokenStr;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-4 h-4 fill-emerald-400/20" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Manual Meter Verification & Vend</h2>
              <p className="text-[11px] text-zinc-400">Direct bank payment fulfillment & WhatsApp payment links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* SUCCESS SCREEN 1: TOKEN VENDED DIRECTLY */}
          {vendResult ? (
            <div className="space-y-5 animate-in zoom-in-95 duration-200">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Electricity Token Generated!</h3>
                <p className="text-xs text-emerald-300/80">
                  {vendResult.message || 'Token vended successfully from BuyPower'}
                </p>
              </div>

              {/* Token Display */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Meter Token
                </span>
                <div className="text-2xl font-mono font-bold tracking-wider text-emerald-400 select-all py-1">
                  {formatTokenDisplay(vendResult.token)}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleCopyToken}
                    className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {tokenCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copy Token</span>
                      </>
                    )}
                  </button>

                  <a
                    href={api.getReceiptUrl(vendResult.reference)}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Receipt (PDF)</span>
                  </a>
                </div>
              </div>

              {/* Order Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Customer</span>
                  <span className="font-semibold text-zinc-200">{vendResult.customerName || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Units Credited</span>
                  <span className="font-semibold text-emerald-400 font-mono">{vendResult.units || 'N/A'} kWh</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Meter / Disco</span>
                  <span className="font-mono text-zinc-200">{vendResult.meterNumber} ({vendResult.disco})</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Order Reference</span>
                  <span className="font-mono text-zinc-300">{vendResult.reference}</span>
                </div>
              </div>

              {/* WhatsApp notification status */}
              {vendResult.whatsappDeliveryFailed ? (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    WhatsApp delivery pending. Please copy the token above and share it with the customer directly.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Token and electronic receipt dispatched to customer WhatsApp.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={handleReset}
                  className="h-9 px-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  Vend Another Meter
                </button>
                <button
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : linkResult ? (
            /* SUCCESS SCREEN 2: PAYMENT LINK & DEDICATED ACCOUNT GENERATED */
            <div className="space-y-5 animate-in zoom-in-95 duration-200">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Payment Link & Account Generated!</h3>
                <p className="text-xs text-emerald-300/80">
                  {linkResult.whatsappSent 
                    ? `Payment details dispatched to customer WhatsApp (${customerPhone})` 
                    : 'Dedicated bank account ready for transfer'}
                </p>
              </div>

              {/* Dedicated Bank Account Details Card */}
              {linkResult.bankTransferDetails?.accountNumber && (
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-emerald-400" />
                      Dedicated Bank Transfer
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                      Auto-Vend on Pay
                    </span>
                  </div>

                  <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-mono">
                        {linkResult.bankTransferDetails.bankName || 'Wema Bank'}
                      </span>
                      <span className="text-xl font-mono font-bold text-white tracking-wider select-all">
                        {linkResult.bankTransferDetails.accountNumber}
                      </span>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        {linkResult.bankTransferDetails.accountName || 'Energiease Customer'}
                      </span>
                    </div>

                    <button
                      onClick={handleCopyAccount}
                      className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      {accountCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                    <span>Payable Amount:</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      ₦{linkResult.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Online Payment Link */}
              {linkResult.paymentUrl && (
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                    Online Checkout Link
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={linkResult.paymentUrl}
                      className="w-full h-8 px-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 select-all truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="h-8 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      {linkCopied ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-400" />
                      )}
                      <span>Copy</span>
                    </button>
                    <a
                      href={linkResult.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Note on Auto Vending */}
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300/90 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero-touch fulfillment:</strong> As soon as the customer transfers to this bank account or pays via the link, the system will verify payment and <strong>automatically vend the token to their WhatsApp</strong>.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={handleReset}
                  className="h-9 px-4 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  Create Another Link
                </button>
                <button
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: METER INPUT & LIVE VERIFICATION */}
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Meter Number */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Meter Number</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={meterNumber}
                      onChange={(e) => {
                        setMeterNumber(e.target.value);
                        setVerificationResult(null);
                        setVerificationError(null);
                      }}
                      placeholder="e.g. 0101160000000"
                      className="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-sm font-mono text-white placeholder:text-zinc-600 transition-colors"
                    />
                  </div>

                  {/* Vend Type Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider block">
                      Type
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 h-10">
                      <button
                        type="button"
                        onClick={() => {
                          setVendType('PREPAID');
                          setVerificationResult(null);
                        }}
                        className={`text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          vendType === 'PREPAID'
                            ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Prepaid
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVendType('POSTPAID');
                          setVerificationResult(null);
                        }}
                        className={`text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          vendType === 'POSTPAID'
                            ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Postpaid
                      </button>
                    </div>
                  </div>
                </div>

                {/* DISCO Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Electricity Distribution Company (DISCO)</span>
                    <span className="text-zinc-500 text-[10px] font-normal">BuyPower Live Gateway</span>
                  </label>
                  <select
                    value={disco}
                    onChange={(e) => {
                      setDisco(e.target.value);
                      setVerificationResult(null);
                      setVerificationError(null);
                    }}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs text-zinc-200 cursor-pointer"
                  >
                    {DISCOS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Verification Trigger Button */}
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying || !meterNumber.trim()}
                  className="w-full h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {verifying ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                      <span>Verifying meter with {disco}...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Verify Customer & Meter Details</span>
                    </>
                  )}
                </button>

                {/* Error Banner */}
                {verificationError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{verificationError}</span>
                  </div>
                )}
              </div>

              {/* STEP 2: VERIFIED CUSTOMER PROFILE CARD */}
              {verificationResult && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-emerald-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verified Account</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono font-medium">
                        Min. ₦{verificationResult.minVendAmount?.toLocaleString() || '1,000'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-start gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase">Customer Name</span>
                          <span className="font-semibold text-white">{verificationResult.name}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Zap className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase">Meter / Disco</span>
                          <span className="font-mono text-zinc-200">{verificationResult.meterNumber} ({verificationResult.disco})</span>
                        </div>
                      </div>

                      {verificationResult.address && verificationResult.address !== 'N/A' && (
                        <div className="sm:col-span-2 flex items-start gap-2 pt-1 border-t border-zinc-800/60">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase">Address</span>
                            <span className="text-zinc-300 text-[11px]">{verificationResult.address}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3 OPERATIONAL WORKFLOW TABS */}
                  <div className="flex items-center border-b border-zinc-800 gap-3 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setActionMode('direct_vend')}
                      className={`pb-2.5 flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                        actionMode === 'direct_vend'
                          ? 'border-emerald-500 text-emerald-400 font-semibold'
                          : 'border-transparent text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>⚡ Vend Directly (Bank Paid)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionMode('payment_link')}
                      className={`pb-2.5 flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                        actionMode === 'payment_link'
                          ? 'border-emerald-500 text-emerald-400 font-semibold'
                          : 'border-transparent text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>🔗 Send Payment Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionMode('save_only')}
                      className={`pb-2.5 flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                        actionMode === 'save_only'
                          ? 'border-emerald-500 text-emerald-400 font-semibold'
                          : 'border-transparent text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Save Meter</span>
                    </button>
                  </div>

                  {/* Customer Phone (Common) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      <span>Customer WhatsApp / Phone Number</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 08012345678 or 2348012345678"
                      className="w-full h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-mono text-white placeholder:text-zinc-600 transition-colors"
                    />
                  </div>

                  {/* MODE 1: DIRECT VEND (MANUAL BANK PAYMENT CONFIRMED) */}
                  {actionMode === 'direct_vend' && (
                    <div className="space-y-3 pt-1">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                        <span>
                          <strong>Manual bank payment confirmed:</strong> The customer paid directly to our corporate bank account or cash. Vending will execute automatically from BuyPower and deliver token + receipt to customer WhatsApp.
                        </span>
                      </div>

                      {/* Amount Input */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                          <span>Vend Amount (₦)</span>
                          <span className="text-zinc-500 text-[10px]">No Service Fee Applied</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-zinc-400 font-mono text-sm">₦</span>
                          <input
                            type="number"
                            min={verificationResult.minVendAmount || 100}
                            step="100"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full h-10 pl-8 pr-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-sm font-semibold font-mono text-white transition-colors"
                          />
                        </div>
                      </div>

                      {/* Quick Amount Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {PRESET_AMOUNTS.map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setAmount(amt)}
                            className={`h-7 px-2.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                              Number(amount) === amt
                                ? 'bg-emerald-500 text-zinc-950 font-bold'
                                : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                            }`}
                          >
                            ₦{amt.toLocaleString()}
                          </button>
                        ))}
                      </div>

                      {/* WhatsApp toggle */}
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none pt-1">
                        <input
                          type="checkbox"
                          checked={notifyWhatsApp}
                          onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                          className="rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                        />
                        <span>Send Token & PDF Receipt to WhatsApp automatically</span>
                      </label>

                      {submitError && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{submitError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleDirectVend}
                        disabled={submitting || !customerPhone.trim() || !amount}
                        className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md mt-2"
                      >
                        {submitting ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin text-white" />
                            <span>Vending ₦{Number(amount).toLocaleString()} from BuyPower Wallet...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 fill-white" />
                            <span>⚡ Vend ₦{Number(amount || 0).toLocaleString()} Electricity Token</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* MODE 2: GENERATE & SEND PAYMENT LINK */}
                  {actionMode === 'payment_link' && (
                    <div className="space-y-3 pt-1">
                      <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-start gap-2">
                        <Building2 className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                        <span>
                          <strong>Awaiting customer payment:</strong> Generates a checkout payment link + dedicated 30-min bank transfer account. Once paid, the system automatically vends the token without staff intervention.
                        </span>
                      </div>

                      {/* Vend Amount Input */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                          <span>Vend Amount (₦)</span>
                          <span className="text-zinc-400 text-[10px]">+ ₦100 Service Fee</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-zinc-400 font-mono text-sm">₦</span>
                          <input
                            type="number"
                            min={verificationResult.minVendAmount || 100}
                            step="100"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full h-10 pl-8 pr-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-sm font-semibold font-mono text-white transition-colors"
                          />
                        </div>
                      </div>

                      {/* Quick Amount Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {PRESET_AMOUNTS.map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setAmount(amt)}
                            className={`h-7 px-2.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                              Number(amount) === amt
                                ? 'bg-blue-500 text-white font-bold'
                                : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                            }`}
                          >
                            ₦{amt.toLocaleString()}
                          </button>
                        ))}
                      </div>

                      {/* Total Calculation breakdown */}
                      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400">Total Customer Payable:</span>
                        <span className="text-sm font-bold text-white">
                          ₦{(Number(amount || 0) + 100).toLocaleString()}
                        </span>
                      </div>

                      {/* WhatsApp toggle */}
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none pt-1">
                        <input
                          type="checkbox"
                          checked={notifyWhatsApp}
                          onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                          className="rounded border-zinc-800 bg-zinc-900 text-blue-500 focus:ring-blue-500 w-4 h-4"
                        />
                        <span>Send Payment Link & Virtual Account to customer WhatsApp</span>
                      </label>

                      {submitError && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{submitError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleCreatePaymentLink}
                        disabled={submitting || !customerPhone.trim() || !amount}
                        className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md mt-2"
                      >
                        {submitting ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin text-white" />
                            <span>Generating Payment Link & Virtual Account...</span>
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-4 h-4" />
                            <span>Generate & Send Payment Link (₦{(Number(amount || 0) + 100).toLocaleString()})</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* MODE 3: SAVE METER TO REGISTRY ONLY */}
                  {actionMode === 'save_only' && (
                    <div className="space-y-3 pt-1">
                      {saveSuccessMessage && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{saveSuccessMessage}</span>
                        </div>
                      )}

                      {submitError && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{submitError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveMeterOnly}
                        disabled={submitting || !customerPhone.trim()}
                        className="w-full h-10 rounded-lg bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-900 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs mt-2"
                      >
                        {submitting ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin text-zinc-900" />
                            <span>Saving meter to database...</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5 text-zinc-900" />
                            <span>Save Meter to Customer Registry</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default ManualVendModal;
