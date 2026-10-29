'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '../../lib/api';
import { SalesPartnerProfile, SupportedBank, WalletDetails } from '../../types';
import {
  Wallet,
  ArrowDownRight,
  ShieldCheck,
  Building,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  CreditCard,
  ChevronRight,
  Info,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface SalespersonPayoutManagerProps {
  currentAgent: SalesPartnerProfile;
}

export const SalespersonPayoutManager: React.FC<SalespersonPayoutManagerProps> = ({
  currentAgent,
}) => {
  const queryClient = useQueryClient();

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [selectedBankCode, setSelectedBankCode] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>(
    currentAgent.payoutDestination?.accountNumber || currentAgent.phone || ''
  );
  const [accountName, setAccountName] = useState<string>(
    currentAgent.payoutDestination?.accountHolderName || currentAgent.fullName || ''
  );
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);

  // 1. Fetch live salesperson wallet details
  const {
    data: walletData,
    isLoading: isWalletLoading,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ['salespersonWallet', currentAgent.id],
    queryFn: () => walletApi.getDetails({ salesPartnerId: currentAgent.id }),
    refetchInterval: 15000,
  });

  // 2. Fetch supported Ethiopian banks from Chapa
  const {
    data: banksData,
    isLoading: isBanksLoading,
  } = useQuery({
    queryKey: ['chapaBanks'],
    queryFn: () => walletApi.getBanks(),
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  });

  const banks: SupportedBank[] = banksData?.banks || [
    { id: '855', code: '855', name: 'telebirr', acronym: 'Telebirr' },
    { id: '946', code: '946', name: 'Commercial Bank of Ethiopia (CBE)', acronym: 'CBE' },
    { id: '347', code: '347', name: 'Bank of Abyssinia', acronym: 'BOA' },
    { id: '836', code: '836', name: 'Cooperative Bank of Oromia (COOP)', acronym: 'COOP' },
    { id: '128', code: '128', name: 'CBEBirr', acronym: 'CBEBirr' },
    { id: '266', code: '266', name: 'M-Pesa', acronym: 'M-Pesa' },
  ];

  const wallet = walletData?.wallet;
  // Available commissions ready for cashout
  const availableEtb = wallet?.balances?.availableEtb ?? Number(currentAgent.eligibleCommissions || 0);
  const lockedEtb = wallet?.balances?.lockedEtb ?? Number(currentAgent.pendingCommissions || 0);
  const totalPaidEtb = Number(currentAgent.paidCommissions || 0);
  const transactions = wallet?.transactions || [];

  // Payout transactions (PAYOUT_HOLD, PAYOUT_SUCCESS, PAYOUT_REFUND)
  const payoutTxs = transactions.filter(
    (t) =>
      t.type === 'PAYOUT_HOLD' ||
      t.type === 'PAYOUT_SUCCESS' ||
      t.type === 'PAYOUT_REFUND' ||
      t.ref.startsWith('POW-')
  );

  // Initialize prefilled bank when bank list loads
  React.useEffect(() => {
    if (banks.length > 0 && !selectedBankCode) {
      // Check if agent's registered provider matches a bank
      const prov = (currentAgent.payoutDestination?.provider || '').toLowerCase();
      const matched = banks.find(
        (b) =>
          b.name.toLowerCase().includes(prov) ||
          (b.acronym && b.acronym.toLowerCase().includes(prov)) ||
          b.code.toLowerCase().includes(prov)
      );
      if (matched) {
        setSelectedBankCode(matched.code);
      } else {
        setSelectedBankCode(banks[0].code);
      }
    }
  }, [banks, currentAgent.payoutDestination, selectedBankCode]);

  // Withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async (data: {
      amount: number;
      bank_code: string;
      account_number: string;
      account_name: string;
    }) => {
      setPayoutError(null);
      return walletApi.requestWithdrawal({
        ...data,
        salesPartnerId: currentAgent.id,
      });
    },
    onSuccess: (res) => {
      setPayoutSuccessMsg(
        `Withdrawal requested! Reference: ${res.reference}. ETB ${res.amount} is being transferred to ${res.bankName} (${res.accountNumber}).`
      );
      setIsPayoutModalOpen(false);
      setWithdrawAmount('');
      refetchWallet();
      queryClient.invalidateQueries({ queryKey: ['salespersonWallet'] });
      setTimeout(() => setPayoutSuccessMsg(null), 8000);
    },
    onError: (err: any) => {
      setPayoutError(err?.message || 'Withdrawal request failed');
    },
  });

  const handleStartWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);

    if (isNaN(amountNum) || amountNum < 10) {
      setPayoutError('Minimum withdrawal amount is 10 ETB');
      return;
    }

    if (amountNum > availableEtb) {
      setPayoutError(`Insufficient eligible balance. You can withdraw up to ETB ${availableEtb.toLocaleString()}`);
      return;
    }

    if (!accountNumber.trim()) {
      setPayoutError('Please provide a valid account or mobile number');
      return;
    }

    withdrawMutation.mutate({
      amount: amountNum,
      bank_code: selectedBankCode,
      account_number: accountNumber.trim(),
      account_name: accountName.trim() || currentAgent.fullName,
    });
  };

  const handleSetMax = () => {
    setWithdrawAmount(availableEtb.toString());
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Alert */}
      {payoutSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold">{payoutSuccessMsg}</p>
          </div>
          <button onClick={() => setPayoutSuccessMsg(null)} className="p-1 text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Eligible for Cashout (Main Hero Card) */}
        <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 text-white shadow-xl border border-emerald-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Eligible for Cashout
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
              Ready to Withdraw
            </span>
          </div>

          <div className="text-3xl font-bold font-mono tracking-tight text-white mb-2">
            ETB {availableEtb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-300 mb-5">
            Verified earnings from delivered customer orders. Withdraw directly to Telebirr or any Ethiopian bank.
          </p>

          <button
            onClick={() => {
              setPayoutError(null);
              setIsPayoutModalOpen(true);
            }}
            disabled={availableEtb < 10}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
              availableEtb >= 10
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 active:scale-95 shadow-emerald-500/25'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>{availableEtb >= 10 ? 'Request Payout via Chapa' : 'Min 10 ETB for Cashout'}</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>

        {/* Pending Escrow Commissions */}
        <div className="p-6 rounded-3xl glass-card border border-white/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                Pending Escrow
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                In Transit / Unconfirmed
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mb-1">
              ETB {lockedEtb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500">
              Secured in supplier collateral vault. Automatically shifts to your eligible balance when the customer confirms delivery.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Escrow Guarantee</span>
            <span className="font-semibold text-emerald-700">100% Backed</span>
          </div>
        </div>

        {/* Lifetime Settled Earnings */}
        <div className="p-6 rounded-3xl glass-card border border-white/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-slate-600" />
                Total Paid Out
              </span>
              <button
                onClick={() => refetchWallet()}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                title="Refresh balances"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isWalletLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mb-1">
              ETB {totalPaidEtb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500">
              Lifetime total commissions transferred directly to your bank and Telebirr accounts through Azwari.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Verification Status</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Agent
            </span>
          </div>
        </div>
      </div>

      {/* Registered Payout Channel Card */}
      <div className="glass-card rounded-3xl border border-white/90 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Default Payout Channel
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            Active Payout Route
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl glass-card-subtle border border-slate-200/80">
            <span className="text-slate-500 block text-[11px]">Provider</span>
            <span className="font-bold text-slate-900">{currentAgent.payoutDestination?.provider || 'Telebirr'}</span>
          </div>
          <div className="p-3 rounded-2xl glass-card-subtle border border-slate-200/80">
            <span className="text-slate-500 block text-[11px]">Account / Mobile</span>
            <span className="font-mono font-bold text-slate-900">{currentAgent.payoutDestination?.accountNumber || currentAgent.phone}</span>
          </div>
          <div className="p-3 rounded-2xl glass-card-subtle border border-slate-200/80">
            <span className="text-slate-500 block text-[11px]">KYC Registered Name</span>
            <span className="font-bold text-slate-900">{currentAgent.payoutDestination?.accountHolderName || currentAgent.fullName}</span>
          </div>
        </div>
      </div>

      {/* Payout & Withdrawal History */}
      <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Withdrawal & Payout History</h3>
            <p className="text-xs text-slate-500">
              Real-time settlement status of your direct bank transfers and Telebirr cashouts.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{payoutTxs.length} transfer records</span>
        </div>

        {payoutTxs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs glass-card-subtle rounded-2xl border border-slate-200/50">
            <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No withdrawal requests yet</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              When you earn commissions, click &quot;Request Payout via Chapa&quot; to transfer funds to your bank.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Transfer Reference</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {payoutTxs.map((tx) => {
                  const isSuccess = tx.type === 'PAYOUT_SUCCESS' || tx.status === 'SUCCESS';
                  const isPending = tx.type === 'PAYOUT_HOLD' || tx.status === 'PENDING';
                  const isRefund = tx.type === 'PAYOUT_REFUND' || tx.status === 'FAILED';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {tx.ref}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {tx.metadata?.bankName || currentAgent.payoutDestination?.provider || 'Telebirr'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        ETB {tx.amountEtb.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> Processing Bank Clearance
                          </span>
                        )}
                        {isRefund && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <AlertCircle className="w-3 h-3 text-rose-600" /> Refunded to Wallet
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSTANT PAYOUT REQUEST MODAL */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="glass-card rounded-3xl border border-white max-w-md w-full p-6 shadow-2xl relative bg-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Request Instant Payout</h3>
                  <p className="text-xs text-slate-500">Chapa Direct Bank Transfer</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPayoutModalOpen(false);
                  setPayoutError(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {payoutError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{payoutError}</span>
              </div>
            )}

            <form onSubmit={handleStartWithdrawal} className="space-y-4">
              {/* Amount input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Withdrawal Amount (ETB) *</label>
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline"
                  >
                    Max (ETB {availableEtb.toLocaleString()})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">ETB</span>
                  <input
                    type="number"
                    min="10"
                    max={availableEtb}
                    step="1"
                    required
                    placeholder="Enter amount (min 10)"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full text-sm font-mono font-bold rounded-xl border border-slate-300 pl-12 pr-4 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">Minimum withdrawal is 10 ETB</span>
              </div>

              {/* Destination Bank Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Ethiopian Destination Bank / Wallet *
                </label>
                <select
                  required
                  value={selectedBankCode}
                  onChange={(e) => setSelectedBankCode(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name} {bank.acronym ? `(${bank.acronym})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number / Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Account Number or Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100012345678 or 0911223344"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              {/* Beneficiary Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Beneficiary Name (Must match National ID / Bank Record) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abebe Bikila"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              {/* Instant Transfer Guarantee */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  <strong>Zero Platform Fee:</strong> Funds are sent automatically using Chapa Bulk Transfer API. Bank clearance takes 1-15 minutes for Telebirr/CBE and up to 2 hours for other private commercial banks.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={withdrawMutation.isPending}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-98 transition-all disabled:opacity-60"
                >
                  {withdrawMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Initiating Chapa Transfer...</span>
                    </>
                  ) : (
                    <>
                      <span>Cash Out via Chapa</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
