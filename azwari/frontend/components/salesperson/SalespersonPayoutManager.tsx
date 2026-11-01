'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commissionsApi } from '../../lib/api';
import { SalesPartnerProfile, SettlementBatch } from '../../types';
import {
  WalletCards,
  ShieldCheck,
  Building,
  Smartphone,
  CheckCircle2,
  Clock,
  RefreshCw,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

interface SalespersonPayoutManagerProps {
  currentAgent: SalesPartnerProfile;
}

export const SalespersonPayoutManager: React.FC<SalespersonPayoutManagerProps> = ({
  currentAgent,
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Fetch real audited settlement batches for this sales agent
  const {
    data: batchesData,
    isLoading: isBatchesLoading,
    refetch: refetchBatches,
  } = useQuery({
    queryKey: ['salespersonBatches', currentAgent.id],
    queryFn: () => commissionsApi.getBatches(),
    refetchInterval: 12000,
  });

  const batches: SettlementBatch[] = batchesData?.batches || [];

  // Balances
  const eligibleEtb = Number(currentAgent.eligibleCommissions || 0);
  const pendingEtb = Number(currentAgent.pendingCommissions || 0);
  const paidEtb = Number(currentAgent.paidCommissions || 0);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  return (
    <div className="space-y-7">
      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Eligible for Settlement (Main Hero Card) */}
        <div className="relative overflow-hidden p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white shadow-xl border border-indigo-500/20 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Eligible for Settlement
              </span>
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-bold border border-indigo-400/20">
                Awaiting Merchant Payout
              </span>
            </div>

            <div className="text-3xl font-bold font-mono tracking-tight text-white mb-2">
              ETB {eligibleEtb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Delivered and customer-verified orders. Merchants execute direct settlements to your registered Telebirr or CBE account within 24–48 hours.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <span>Your Net Payout:</span>
            <span className="font-bold text-emerald-400 text-sm">80% Net Directly to You</span>
          </div>
        </div>

        {/* Pending Fulfillment / Delivery */}
        <div className="p-7 rounded-3xl glass-card border border-white/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                In Fulfillment / In Transit
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold">
                Pending Delivery
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mb-1">
              ETB {pendingEtb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Commissions for active customer orders in transit. Automatically shifts to your Eligible balance the instant the buyer confirms receipt.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Customer Confirmation</span>
            <span className="font-semibold text-slate-800">Direct Link</span>
          </div>
        </div>

        {/* Lifetime Paid Out Earnings */}
        <div className="p-7 rounded-3xl glass-card border border-white/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Total Settled & Paid
              </span>
              <button
                onClick={() => refetchBatches()}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                title="Refresh settlement batches"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBatchesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mb-1">
              ETB {paidEtb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Audited commissions transferred directly into your Telebirr and bank accounts with verified transaction slip references.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Verified Batches</span>
            <span className="font-semibold text-emerald-700">{batches.length} settled</span>
          </div>
        </div>
      </div>

      {/* Explainer Banner */}
      <div className="p-5 rounded-3xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <WalletCards className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">How Commission Settlement Works</p>
            <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
              Customers pay merchants directly via Telebirr or CBE screenshot. Once the customer confirms delivery, the merchant transfers your <strong>80% net payout</strong> directly to your bank account and enters the reference slip code. The platform retains a 20% marketplace fee.
            </p>
          </div>
        </div>
      </div>

      {/* Registered Payout Destination */}
      <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Your Registered Payout Destination
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">
            Verified Payout Account
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl glass-card-subtle border border-slate-200/80">
            <span className="text-slate-500 block text-[11px] mb-1">Payout Provider</span>
            <span className="font-bold text-slate-900 text-sm">{currentAgent.payoutDestination?.provider || 'Telebirr'}</span>
          </div>
          <div className="p-4 rounded-2xl glass-card-subtle border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[11px] mb-1">Account / Mobile Number</span>
              <span className="font-mono font-bold text-indigo-900 text-sm">
                {currentAgent.payoutDestination?.accountNumber || currentAgent.phone}
              </span>
            </div>
            <button
              onClick={() => handleCopy(currentAgent.payoutDestination?.accountNumber || currentAgent.phone, 'account')}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              title="Copy account number"
            >
              {copiedText === 'account' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-4 rounded-2xl glass-card-subtle border border-slate-200/80">
            <span className="text-slate-500 block text-[11px] mb-1">Account Holder Name</span>
            <span className="font-bold text-slate-900 text-sm">{currentAgent.payoutDestination?.accountHolderName || currentAgent.fullName}</span>
          </div>
        </div>
      </div>

      {/* Audited Settlement Batches Table - Spacious Layout */}
      <div className="glass-card rounded-3xl border border-white/90 p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Commission Settlement Batches &amp; Audit Records
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanent bank transfer receipts and Telebirr confirmation references recorded by merchants.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-bold">
            {batches.length} batch(es)
          </span>
        </div>

        {batches.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs glass-card-subtle rounded-3xl border border-slate-200/70 space-y-2">
            <CreditCard className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
            <p className="font-semibold text-slate-700 text-sm">No settlement batches recorded yet</p>
            <p className="text-slate-400 text-xs max-w-md mx-auto">
              When customer orders are delivered, merchants will transfer your 80% net commission directly to your {currentAgent.payoutDestination?.provider || 'Telebirr'} account and the audited slip will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/70 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200/90 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-4 px-6 min-w-[170px]">Batch Number</th>
                  <th className="py-4 px-6 min-w-[160px]">Payment Channel</th>
                  <th className="py-4 px-6 min-w-[180px]">Destination Account</th>
                  <th className="py-4 px-6 min-w-[150px] text-right">Net Paid (80%)</th>
                  <th className="py-4 px-6 min-w-[220px]">Bank Slip / Ref ID</th>
                  <th className="py-4 px-6 min-w-[140px]">Settled Date</th>
                  <th className="py-4 px-6 min-w-[120px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {batch.batchNumber}
                    </td>
                    <td className="py-4 px-6 text-slate-700 font-medium">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-[11px] font-semibold border border-slate-200">
                        {batch.payoutMethod}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600">
                      {batch.destinationAccount}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-emerald-700 text-right text-sm">
                      ETB {batch.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono bg-slate-100 text-slate-900 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200">
                          {batch.transactionReference || 'N/A'}
                        </span>
                        {batch.transactionReference && (
                          <button
                            onClick={() => handleCopy(batch.transactionReference, batch.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded"
                            title="Copy slip reference"
                          >
                            {copiedText === batch.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                      {new Date(batch.settledAt || batch.id).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
