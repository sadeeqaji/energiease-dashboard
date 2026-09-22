import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Download, 
  Coins, 
  Wallet, 
  TrendingUp, 
  RefreshCw,
  Calendar,
  ShieldCheck,
  Percent,
  Receipt
} from 'lucide-react';
import { AccountingSummary } from '../types';
import { api } from '../api';

export const AccountingView: React.FC = () => {
  const [accountingData, setAccountingData] = useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Date range filter
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAccounting = async () => {
    setLoading(true);
    try {
      let start: string | undefined = undefined;
      let end: string | undefined = undefined;

      const now = new Date();
      if (dateRange === 'today') {
        start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      } else if (dateRange === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        start = d.toISOString();
      } else if (dateRange === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        start = d.toISOString();
      } else if (startDate || endDate) {
        start = startDate || undefined;
        end = endDate || undefined;
      }

      const res = await api.getAccountingSummary(start, end);
      setAccountingData(res);
    } catch (err) {
      console.error('Failed to load accounting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounting();
  }, [dateRange]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const rows = await api.exportAccounting(startDate || undefined, endDate || undefined);
      if (!rows || rows.length === 0) {
        alert('No transactions found to export.');
        return;
      }

      // Convert to CSV
      const headers = [
        'Reference',
        'Date',
        'Customer Phone',
        'Meter Number',
        'DISCO',
        'Customer Paid (NGN)',
        'DISCO Energy Cost (NGN)',
        'Service Fee Earned (NGN)',
        'BuyPower 1.5% Commission (NGN)',
        'Monnify 1.6125% Fee (NGN)',
        'Net Profit Earned (NGN)',
        'Token',
        'Status',
      ];

      const csvRows = rows.map((r) => [
        `"${r.reference}"`,
        `"${new Date(r.date).toISOString()}"`,
        `"${r.customerPhone}"`,
        `"${r.meterNumber}"`,
        `"${r.disco}"`,
        r.customerPaid,
        r.discoEnergyCost,
        r.serviceFeeEarned,
        r.buypowerCommissionEarned,
        r.monnifyFeeDeducted,
        r.netProfitEarned,
        `"${r.token}"`,
        `"${r.status}"`,
      ]);

      const csvContent = [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `energiease-reconciliation-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const summary = accountingData?.summary;
  const buypowerWallet = accountingData?.buypowerWallet;
  const ledger = accountingData?.ledger || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Unit Economics Formula Banner - Crisp 1px borders, clean zinc surface */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
            <Percent className="w-3.5 h-3.5 text-zinc-400" />
            EnergiEase Settlement & Unit Economics Model
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">BuyPower & Monnify Automated Reconciliation</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 border-t border-zinc-800/60 text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 block text-[10px] uppercase font-medium">1. Customer Paid</span>
            <span className="text-zinc-100 font-semibold font-mono">Vend Amount + ₦100.00</span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 block text-[10px] uppercase font-medium">2. BuyPower Commission</span>
            <span className="text-emerald-400 font-semibold font-mono">+1.50% of Vend Amount</span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 block text-[10px] uppercase font-medium">3. Monnify Gateway Fee</span>
            <span className="text-zinc-400 font-semibold font-mono">-1.6125% (1.5% + 7.5% VAT)</span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 block text-[10px] uppercase font-medium">4. Net Retained Margin</span>
            <span className="text-emerald-400 font-semibold font-mono">₦100 + BP Comm - Monnify</span>
          </div>
        </div>
      </div>

      {/* Date Range Selector & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-400 uppercase font-medium text-[11px] mr-1 tracking-wider">Timeframe:</span>
          {[
            { id: 'all', label: 'All Time' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '7d', label: 'Last 7 Days' },
            { id: 'today', label: 'Today' },
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id as any)}
              className={`px-2.5 h-7 rounded-md text-xs transition-colors border cursor-pointer ${
                dateRange === range.id
                  ? 'bg-zinc-800 border-zinc-700 text-white font-medium shadow-xs'
                  : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAccounting}
            disabled={loading}
            className="h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-200' : ''}`} />
            <span>Recalculate</span>
          </button>

          {/* 1-Click Export CSV */}
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="h-8 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Exporting...' : 'Export CSV Ledger'}</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards - 6 Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Gross Customer Paid */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 shadow-xs space-y-1">
          <div className="text-xs text-zinc-400 flex justify-between">
            <span>Gross Customer Collections</span>
            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            ₦{(summary?.grossCustomerPaid ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono pt-1">
            Across {summary?.totalOrders ?? 0} settled transactions
          </div>
        </div>

        {/* DISCO Energy Cost */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 shadow-xs space-y-1">
          <div className="text-xs text-zinc-400 flex justify-between">
            <span>DISCO Energy Vend Cost</span>
            <Receipt className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-300 tabular-nums">
            ₦{(summary?.discoEnergyCost ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono pt-1">
            Debited by BuyPower to DISCOs
          </div>
        </div>

        {/* Net Profit Margin */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 shadow-xs space-y-1">
          <div className="text-xs text-zinc-400 flex justify-between">
            <span>Net Retained Margin</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
            ₦{(summary?.netProfitMargin ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono pt-1">
            Net revenue after provider and payment gateway fees
          </div>
        </div>

        {/* Service Fee Revenue */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 shadow-xs space-y-1">
          <div className="text-xs text-zinc-400">
            Customer Service Fees (₦100/tx)
          </div>
          <div className="text-lg font-bold font-mono text-zinc-200 tabular-nums">
            +₦{(summary?.serviceFeeRevenue ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono pt-1">
            Fixed commission collected per vend
          </div>
        </div>

        {/* BuyPower 1.5% Commission */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 shadow-xs space-y-1">
          <div className="text-xs text-zinc-400">
            BuyPower 1.5% Provider Commission
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
            +₦{(summary?.buypowerCommission ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono pt-1">
            Accrued in BuyPower commission balance
          </div>
        </div>

        {/* Monnify 1.6125% Fees */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 shadow-xs space-y-1">
          <div className="text-xs text-zinc-400">
            Monnify / Moniepoint Fees (1.6125%)
          </div>
          <div className="text-lg font-bold font-mono text-zinc-400 tabular-nums">
            -₦{(summary?.monnifyFees ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono pt-1">
            1.50% base fee + 7.5% VAT deducted at source
          </div>
        </div>
      </div>

      {/* Daily Reconciliation Ledger Table */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Daily Settlement & Reconciliation Ledger
            </h2>
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            Audited against BuyPower debits & Monnify settlements
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-zinc-400 text-[11px] font-medium">
                <th className="py-2.5 px-3.5 font-normal">Date</th>
                <th className="py-2.5 px-3.5 font-normal text-center">Orders</th>
                <th className="py-2.5 px-3.5 font-normal text-right">Customer Paid</th>
                <th className="py-2.5 px-3.5 font-normal text-right">DISCO Cost</th>
                <th className="py-2.5 px-3.5 font-normal text-right text-zinc-300">Service Fee (+₦100)</th>
                <th className="py-2.5 px-3.5 font-normal text-right text-emerald-400">BP Comm (+1.5%)</th>
                <th className="py-2.5 px-3.5 font-normal text-right text-zinc-400">Monnify (-1.61%)</th>
                <th className="py-2.5 px-3.5 font-normal text-right font-medium text-emerald-400">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {ledger.map((row) => (
                <tr key={row.date} className="hover:bg-zinc-800/30 transition-colors h-11">
                  <td className="py-2 px-3.5 font-medium text-zinc-200 whitespace-nowrap font-mono">
                    {row.date}
                  </td>
                  <td className="py-2 px-3.5 text-center text-zinc-400 tabular-nums font-mono">
                    {row.ordersCount}
                  </td>
                  <td className="py-2 px-3.5 text-right font-medium text-white tabular-nums font-mono">
                    ₦{row.grossCustomerPaid.toLocaleString()}
                  </td>
                  <td className="py-2 px-3.5 text-right text-zinc-400 tabular-nums font-mono">
                    ₦{row.discoEnergyCost.toLocaleString()}
                  </td>
                  <td className="py-2 px-3.5 text-right text-zinc-300 tabular-nums font-mono">
                    +₦{row.serviceFeeRevenue.toLocaleString()}
                  </td>
                  <td className="py-2 px-3.5 text-right text-emerald-400 tabular-nums font-medium font-mono">
                    +₦{row.buypowerCommission.toLocaleString()}
                  </td>
                  <td className="py-2 px-3.5 text-right text-zinc-400 tabular-nums font-mono">
                    -₦{row.monnifyFees.toLocaleString()}
                  </td>
                  <td className="py-2 px-3.5 text-right font-semibold text-emerald-400 tabular-nums font-mono">
                    ₦{row.netProfit.toLocaleString()}
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 text-xs">
                    {loading ? 'Calculating settlement figures...' : 'No transactions recorded in this period.'}
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
