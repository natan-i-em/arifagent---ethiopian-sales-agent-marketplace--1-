'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ordersApi, telegramApi } from '@/lib/api';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Store, MapPin, User, Package, Send, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function VerifyStockContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [decisionResult, setDecisionResult] = useState<{
    status: 'confirmed' | 'rejected';
    message: string;
  } | null>(null);

  const [botUsername, setBotUsername] = useState('AzwariMerchantBot');

  useEffect(() => {
    telegramApi.getStatus().then((res) => {
      if (res.success && res.botUsername) {
        setBotUsername(res.botUsername);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Missing verification security token. Please open the link from your SMS notification.');
      setLoading(false);
      return;
    }

    ordersApi.getVerifyDetailsByToken(token)
      .then((res) => {
        if (res.success && res.order) {
          setOrder(res.order);
          if (res.order.status === 'CANCELLED_OUT_OF_STOCK' || res.order.uiStatus === 'cancelled_out_of_stock') {
            setDecisionResult({
              status: 'rejected',
              message: 'This item was marked out of stock. Order cancelled silently without contacting the customer.',
            });
          } else if (res.order.status !== 'AWAITING_MERCHANT_VERIFICATION' && res.order.uiStatus !== 'awaiting_verification') {
            setDecisionResult({
              status: 'confirmed',
              message: 'In-store stock was already verified. Payment instructions have been sent to the buyer.',
            });
          }
        } else {
          setError('Order not found or verification link has expired.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to retrieve order details.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleDecision = async (decision: 'confirm' | 'reject') => {
    if (!token || processing) return;
    setProcessing(true);
    try {
      const res = await ordersApi.confirmStockByToken(token, decision);
      if (res.success) {
        if (decision === 'confirm') {
          setDecisionResult({
            status: 'confirmed',
            message: 'Stock verified! Payment link has been automatically dispatched to the buyer via SMS.',
          });
        } else {
          setDecisionResult({
            status: 'rejected',
            message: 'Marked out of stock. Product inventory updated to 0. Buyer was shielded from any SMS.',
          });
        }
      } else {
        alert((res as any).error || 'Failed to process decision. Please try again.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while submitting decision.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-white font-bold text-sm">Verifying Order Availability...</h2>
          <p className="text-slate-400 text-xs">Loading live store item data</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-white font-bold text-base">Invalid or Expired Link</h2>
          <p className="text-slate-400 text-xs leading-relaxed">{error || 'Order record not found.'}</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-colors"
          >
            Go to Azwari Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full mx-auto space-y-5 my-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-xs">
              A
            </div>
            <span className="font-bold tracking-tight text-white text-sm">Azwari Merchant</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Physical Stock Check
          </span>
        </div>

        {/* Decision Banner (If already decided) */}
        {decisionResult ? (
          <div className={`p-6 rounded-3xl border text-center space-y-3 ${
            decisionResult.status === 'confirmed'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
              decisionResult.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {decisionResult.status === 'confirmed' ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
            </div>
            <h2 className="text-lg font-bold text-white">
              {decisionResult.status === 'confirmed' ? 'Stock Confirmed & Reserved!' : 'Marked Out of Stock'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {decisionResult.message}
            </p>

            <div className="pt-3 border-t border-slate-800 text-left">
              <span className="text-[11px] text-slate-400 block mb-1">Connect your shop to Telegram:</span>
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Open @{botUsername}</span>
              </a>
            </div>
          </div>
        ) : (
          /* Live Verification Card */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            {/* Order Identity & Timer */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Order Reference</span>
                <span className="font-mono font-bold text-sm text-emerald-400">#{order.orderNumber}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-xl text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>Hold 45m</span>
              </div>
            </div>

            {/* Product Summary */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-slate-700/80 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-white truncate">{order.productName}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Quantity: <strong className="text-slate-200">{order.quantity} unit(s)</strong>
                  </div>
                </div>
              </div>

              {/* Financial & Destination Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Your Net Payout</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-400">
                    ETB {Number(order.supplierNetPayout || order.totalAmount).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Delivery Subcity</span>
                  <div className="flex items-center gap-1 font-semibold text-slate-200 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{order.deliverySubcity}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                <span>Sales Agent:</span>
                <span className="font-semibold text-slate-300">{order.salesAgentName}</span>
              </div>
            </div>

            {/* Prompt */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Customer is shielded</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The buyer has <strong>NOT</strong> received a payment link yet. Confirming will hold this item in your physical shop for 45 minutes while the customer transfers payment.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={processing}
                onClick={() => handleDecision('confirm')}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>YES, IN STOCK (Hold 45m)</span>
              </button>

              <button
                type="button"
                disabled={processing}
                onClick={() => handleDecision('reject')}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>OUT OF STOCK / SOLD OUT</span>
              </button>
            </div>
          </div>
        )}

        {/* Telegram Connect Notice */}
        <div className="text-center">
          <p className="text-[11px] text-slate-500">
            Azwari Multi-Channel Verification · Instant Telegram Bot & SMS Fallback
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyStockPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyStockContent />
    </Suspense>
  );
}
