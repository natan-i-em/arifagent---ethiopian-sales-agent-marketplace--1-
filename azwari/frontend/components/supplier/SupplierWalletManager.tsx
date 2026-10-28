'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '../../lib/api';
import { Business, Product, WalletDetails, WalletTransactionItem } from '../../types';
import {
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  ExternalLink,
  CreditCard,
  Building,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Info,
  Clock,
  X
} from 'lucide-react';

import { ProductImage } from '../common/ProductImage';
import { useApp } from '../../context/AppContext';

interface SupplierWalletManagerProps {
  currentSupplier: Business;
  products: Product[];
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export const SupplierWalletManager: React.FC<SupplierWalletManagerProps> = ({
  currentSupplier,
  products,
}) => {
  const queryClient = useQueryClient();
  const { sendNotification } = useApp();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Return from Chapa status check
  const [returnedTxRef, setReturnedTxRef] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'verifying' | 'success' | 'failed' | null>(null);
  const [verifiedBalance, setVerifiedBalance] = useState<number | null>(null);

  // Filter transactions
  const [txFilter, setTxFilter] = useState<'all' | 'DEPOSIT' | 'COMMISSION_LOCK' | 'COMMISSION_SETTLE_DEBIT'>('all');

  // Fetch live wallet details
  const {
    data: walletData,
    isLoading: isWalletLoading,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ['supplierWallet', currentSupplier.id],
    queryFn: () => walletApi.getDetails({ businessId: currentSupplier.id }),
    refetchInterval: 15000,
  });

  const wallet = walletData?.wallet;
  const availableEtb = wallet?.balances?.availableEtb ?? currentSupplier.commissionReserveBalance ?? 0;
  const lockedEtb = wallet?.balances?.lockedEtb ?? 0;
  const totalEtb = wallet?.balances?.totalEtb ?? (availableEtb + lockedEtb);
  const transactions: WalletTransactionItem[] = wallet?.transactions || [];

  // Calculate recommended collateral based on active products stock & commission
  const supplierProducts = products.filter((p) => p.supplierId === currentSupplier.id);
  const totalPotentialCommission = supplierProducts.reduce((acc, p) => {
    const commissionPerUnit = Number(p.suggestedRetailPrice || p.unitPrice) - Number(p.unitPrice);
    const activeQty = p.isActive ? (p.stock || 5) : 0;
    return acc + (commissionPerUnit > 0 ? commissionPerUnit * activeQty : 20 * activeQty);
  }, 0);

  const collateralCoverageRatio = totalPotentialCommission > 0 ? (availableEtb / totalPotentialCommission) : 1;
  const isLowCollateral = availableEtb < 200 || (totalPotentialCommission > 500 && collateralCoverageRatio < 0.25);

  // Check URL params for Chapa return
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const depositReturn = params.get('deposit');
    const txRef = params.get('tx_ref') || params.get('trx_ref');

    if (depositReturn === 'return' || txRef) {
      if (txRef) {
        setReturnedTxRef(txRef);
        setVerifyStatus('verifying');

        // Poll verification endpoint
        let attempts = 0;
        const poll = async () => {
          try {
            const res = await walletApi.verifyDeposit(txRef);
            if (res.status === 'success') {
              setVerifyStatus('success');
              setVerifiedBalance(res.walletBalanceEtb);
              refetchWallet();
              queryClient.invalidateQueries({ queryKey: ['supplierWallet'] });
              queryClient.invalidateQueries({ queryKey: ['businesses'] });

              sendNotification({
                recipientRole: 'supplier',
                recipientId: currentSupplier.id,
                type: 'wallet',
                title: 'Collateral Deposit Confirmed',
                message: `Deposit verified! Your available reserve wallet balance is now ETB ${res.walletBalanceEtb.toLocaleString()}.`,
                severity: 'success',
                link: '/portal/supplier?tab=wallet',
                metadata: { amount: res.walletBalanceEtb }
              });

              // Clean return params while keeping tab=wallet
              const cleanUrl = `${window.location.pathname}?tab=wallet`;
              window.history.replaceState({}, '', cleanUrl);
            } else if (res.status === 'failed') {
              setVerifyStatus('failed');
            } else if (attempts < 10) {
              attempts++;
              setTimeout(poll, 2500);
            } else {
              setVerifyStatus('verifying'); // still pending
            }
          } catch (err) {
            console.warn('[Deposit verify poll error]', err);
            if (attempts < 8) {
              attempts++;
              setTimeout(poll, 3000);
            }
          }
        };
        poll();
      } else {
        // Return detected without explicit tx_ref: trigger backend auto-reconciliation
        refetchWallet();
        queryClient.invalidateQueries({ queryKey: ['supplierWallet'] });
        queryClient.invalidateQueries({ queryKey: ['businesses'] });
        const cleanUrl = `${window.location.pathname}?tab=wallet`;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [queryClient, refetchWallet]);

  // Initiate deposit mutation
  const depositMutation = useMutation({
    mutationFn: async (amount: number) => {
      setDepositError(null);
      setIsRedirecting(true);
      return walletApi.initiateDeposit(amount, currentSupplier.id);
    },
    onSuccess: (data) => {
      if (data.checkout_url) {
        // Redirect to Chapa hosted payment page
        window.location.href = data.checkout_url;
      } else {
        setDepositError('No checkout URL received from payment provider');
        setIsRedirecting(false);
      }
    },
    onError: (err: any) => {
      setIsRedirecting(false);
      setDepositError(err?.message || 'Failed to initiate Chapa deposit checkout');
    },
  });

  const handleStartDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = customAmount ? parseFloat(customAmount) : depositAmount;
    if (isNaN(finalAmount) || finalAmount < 10) {
      setDepositError('Minimum deposit is 10 ETB');
      return;
    }
    depositMutation.mutate(finalAmount);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'all') return true;
    return tx.type === txFilter;
  });

  return (
    <div className="space-y-6">
      {/* Return Verification Notification Banner */}
      {returnedTxRef && verifyStatus && (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            verifyStatus === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
              : verifyStatus === 'failed'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-950'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {verifyStatus === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              {verifyStatus === 'failed' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
              {verifyStatus === 'verifying' && <RefreshCw className="w-5 h-5 text-amber-600 animate-spin shrink-0" />}
              <div>
                <p className="text-xs font-bold">
                  {verifyStatus === 'success' && 'Chapa Top-Up Confirmed!'}
                  {verifyStatus === 'failed' && 'Top-Up Unsuccessful or Cancelled'}
                  {verifyStatus === 'verifying' && 'Confirming Deposit with Chapa...'}
                </p>
                <p className="text-[11px] opacity-80 font-mono">Reference: {returnedTxRef}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setReturnedTxRef(null);
                setVerifyStatus(null);
              }}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Collateral Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Collateral */}
        <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl border border-emerald-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Available Collateral
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
              ETB Currency
            </span>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-white mb-2">
            ETB {availableEtb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-300 mb-5">
            Active reserve available to back commissions and keep product listings active.
          </p>
          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/25"
          >
            <Wallet className="w-4 h-4" />
            <span>Top-Up via Chapa</span>
            <ArrowUpRight className="w-4 h-4 ml-auto" />
          </button>
        </div>

        {/* Locked in Active Orders */}
        <div className="p-6 rounded-3xl glass-card border border-white/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-500" />
                Locked in Escrow
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                Protected
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mb-1">
              ETB {lockedEtb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500">
              Reserved for dispatched orders. Released to sales agents only upon customer delivery confirmation.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Escrow Protection</span>
            <span className="font-semibold text-emerald-700">100% Guaranteed</span>
          </div>
        </div>

        {/* Total Collateral Vault */}
        <div className="p-6 rounded-3xl glass-card border border-white/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-slate-600" />
                Total Vault Balance
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
              ETB {totalEtb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500">
              Cumulative balance (Available + Escrow Locked) held securely in the merchant collateral wallet.
            </p>
          </div>

          {/* Collateral Health Indicator */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-700">Listing Health</span>
              <span className={`font-bold ${isLowCollateral ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isLowCollateral ? 'Low Collateral Risk' : 'Optimal Coverage'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isLowCollateral ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(10, collateralCoverageRatio * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Low Collateral Alert Banner */}
      {isLowCollateral && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Collateral Buffer Running Low</p>
            <p className="text-amber-800">
              Under Azwari business rules, if your available collateral drops below the commission required for an incoming order,
              affected products may be automatically paused to protect sales agents. Top up your balance to maintain continuous sales momentum.
            </p>
          </div>
          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="ml-auto shrink-0 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
          >
            Top Up Now
          </button>
        </div>
      )}

      {/* Collateral Ledger & History */}
      <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Collateral Ledger Activity</h3>
            <p className="text-xs text-slate-500">
              Append-only audit ledger recording every deposit, order lock, unlock, and settlement.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {(
              [
                { id: 'all', label: 'All Transactions' },
                { id: 'DEPOSIT', label: 'Deposits (Chapa)' },
                { id: 'COMMISSION_LOCK', label: 'Order Locks' },
                { id: 'COMMISSION_SETTLE_DEBIT', label: 'Settlements' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setTxFilter(filter.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  txFilter === filter.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs glass-card-subtle rounded-2xl border border-slate-200/50">
            <Wallet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No transaction records match the filter</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Deposits and order movements will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Available Balance After</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.type === 'DEPOSIT' || tx.type === 'COMMISSION_UNLOCK';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            tx.type === 'DEPOSIT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.type === 'COMMISSION_LOCK'
                              ? 'bg-amber-100 text-amber-800'
                              : tx.type === 'COMMISSION_UNLOCK'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {tx.type === 'DEPOSIT' && 'Deposit (Chapa)'}
                          {tx.type === 'COMMISSION_LOCK' && 'Order Lock'}
                          {tx.type === 'COMMISSION_UNLOCK' && 'Order Unlock'}
                          {tx.type === 'COMMISSION_SETTLE_DEBIT' && 'Commission Settled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                        {tx.ref}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={isCredit ? 'text-emerald-600' : 'text-slate-800'}>
                          {isCredit ? '+' : '-'}ETB {tx.amountEtb.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        ETB {tx.balanceAfterAvailableEtb.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                        {new Date(tx.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
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

      {/* TOP-UP MODAL */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="glass-card rounded-3xl border border-white max-w-md w-full p-6 shadow-2xl relative bg-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Top-Up Commission Collateral</h3>
                  <p className="text-xs text-slate-500">Secured via Chapa Payment Gateway</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDepositModalOpen(false);
                  setDepositError(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {depositError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{depositError}</span>
              </div>
            )}

            <form onSubmit={handleStartDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Preset Amount (ETB)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setDepositAmount(amt);
                        setCustomAmount('');
                      }}
                      className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all border ${
                        depositAmount === amt && !customAmount
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {amt.toLocaleString()} ETB
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Or Enter Custom Amount (ETB)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">ETB</span>
                  <input
                    type="number"
                    min="10"
                    placeholder="e.g. 3500"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (e.target.value) setDepositAmount(Number(e.target.value));
                    }}
                    className="w-full text-sm font-mono font-bold rounded-xl border border-slate-300 pl-12 pr-4 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">Minimum deposit: 10 ETB</span>
              </div>

              {/* Supported Payment Channels */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Supported Payment Options on Chapa:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-800">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    Telebirr
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-800">
                    <Building className="w-3.5 h-3.5 text-amber-600" />
                    CBEBirr
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-800">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    Debit Card (Visa / Mastercard)
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isRedirecting || depositMutation.isPending}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-98 transition-all disabled:opacity-60"
                >
                  {isRedirecting || depositMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Redirecting to Chapa...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Chapa Checkout</span>
                      <ChevronRight className="w-4 h-4" />
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
