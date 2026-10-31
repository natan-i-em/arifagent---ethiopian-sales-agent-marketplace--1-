'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '../../context/AppContext';
import { PaymentMethodProvider } from '../../types';
import { 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Upload, 
  Truck, 
  Phone, 
  Building2, 
  AlertCircle, 
  ShieldCheck,
  ChevronRight,
  MessageCircleQuestion,
  Package,
  CreditCard,
  ArrowRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { ProductImage } from '../common/ProductImage';

import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../../lib/api';

export const CustomerOrderView: React.FC = () => {
  const { 
    currentUser,
    setCurrentView,
    orders, 
    products,
    selectedCustomerToken, 
    setSelectedCustomerToken, 
    submitPaymentEvidence, 
    extendPaymentWindow, 
    markOrderDelivered,
    createDispute
  } = useApp();

  // Resolve tracking token from URL query params or app state
  const [urlToken, setUrlToken] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        setUrlToken(token);
        setSelectedCustomerToken(token);
      }
    }
  }, [setSelectedCustomerToken]);

  const activeToken = urlToken || selectedCustomerToken;

  // Public order lookup: anyone with the tracking link / token can view the order without login or role blocks
  const { 
    data: publicOrderData, 
    isLoading: isLoadingPublicOrder,
    refetch: refetchPublicOrder 
  } = useQuery({
    queryKey: ['publicOrder', activeToken],
    queryFn: () => ordersApi.getByToken(activeToken),
    enabled: Boolean(activeToken),
    refetchInterval: 10000,
  });

  const publicOrder = publicOrderData?.order;

  // Resolve order: public token fetch takes priority, with fallback to in-memory store
  const currentOrder =
    publicOrder ||
    orders.find((o) => o.publicAccessToken === activeToken) ||
    orders.find((o) => o.publicAccessToken === selectedCustomerToken) ||
    (currentUser?.role === 'salesperson' && currentUser.salespersonId
      ? orders.find((o) => o.salespersonId === currentUser.salespersonId)
      : null);

  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const [chapaVerificationMsg, setChapaVerificationMsg] = useState<string | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  // Countdown timer calculation
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);

  useEffect(() => {
    if (!currentOrder) return;

    const updateTimer = () => {
      const expiresAt = new Date(currentOrder.paymentExpiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeftSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentOrder]);

  // Payment status verifier (for both auto return callback and manual "Check status" button)
  const triggerVerifyPayment = async (silent = false) => {
    if (!activeToken) return;
    setIsVerifyingPayment(true);
    try {
      let queryRef: string | undefined;
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        queryRef = params.get('trx_ref') || params.get('tx_ref') || params.get('reference') || undefined;
      }

      const res = await ordersApi.verifyChapaPayment(activeToken, queryRef);
      if (res.success && (res.order?.paymentStatus === 'verified' || res.order?.orderStatus === 'payment_verified')) {
        setChapaVerificationMsg('Payment verified successfully! Your order has been placed into fulfillment.');
        await refetchPublicOrder();
      } else if (!silent) {
        alert(
          (res as any).message ||
            'Payment is still being confirmed with the bank network. If you completed payment, please wait a few seconds and check again.'
        );
        await refetchPublicOrder();
      }
    } catch (err: any) {
      if (!silent) {
        alert(err.message || 'Unable to verify payment at this time. Please try again in a few moments.');
      }
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Auto-verify Chapa payment on return callback
  useEffect(() => {
    if (typeof window !== 'undefined' && activeToken) {
      const params = new URLSearchParams(window.location.search);
      const isChapaReturn =
        params.get('chapa') === 'success' ||
        params.has('trx_ref') ||
        params.has('tx_ref') ||
        params.get('status') === 'success';

      if (isChapaReturn && currentOrder && currentOrder.paymentStatus !== 'verified') {
        triggerVerifyPayment(true);
        // Retry once after 3 seconds in case network settlement took an extra moment
        const retryTimer = setTimeout(() => {
          if (currentOrder.paymentStatus !== 'verified') {
            triggerVerifyPayment(true);
          }
        }, 3000);
        return () => clearTimeout(retryTimer);
      }
    }
  }, [activeToken, currentOrder?.paymentStatus]);

  const handleChapaPay = async () => {
    setIsCheckingOut(true);
    try {
      const token = activeToken || currentOrder?.publicAccessToken;
      if (!token) throw new Error('Missing tracking token');
      const res = await ordersApi.chapaCheckout(token);
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        alert('Could not open Chapa checkout. Please try again.');
      }
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleConfirmReceived = async () => {
    const isConfirmed = window.confirm(
      'Are you sure you have received your order items? This will confirm final delivery.'
    );
    if (!isConfirmed) return;

    setIsConfirmingDelivery(true);
    try {
      const token = activeToken || currentOrder?.publicAccessToken;
      if (!token) throw new Error('Missing tracking token');
      await ordersApi.confirmCustomerDelivery(token, 'Customer confirmed delivery receipt via public order link');
      if (currentOrder) {
        markOrderDelivered(currentOrder.id, 'Confirmed received by customer via public order page.');
      }
      await refetchPublicOrder();
      setConfirmedSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Failed to confirm delivery');
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason || !currentOrder) return;
    createDispute(currentOrder.id, 'delayed_delivery', disputeReason, 'customer', currentOrder.buyerName);
    setShowDisputeModal(false);
    setDisputeReason('');
  };

  if (isLoadingPublicOrder && !currentOrder) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 glass-card rounded-3xl border border-slate-200 text-center space-y-4 bg-white/90 shadow-sm">
          <div className="w-10 h-10 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-sm font-bold text-slate-800">Loading Order Details...</h2>
          <p className="text-xs text-slate-500">Retrieving verified order and payment instructions from Azwari.</p>
        </div>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 glass-card rounded-3xl border border-slate-200 text-center space-y-4 bg-white/90 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-800">
            <ShieldCheck className="w-6 h-6 text-slate-700" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Private Order Token Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Azwari buyer checkout links are private and sent exclusively to buyers via SMS, or accessible by the verified Sales Agent managing the order.
          </p>
          <Link
            href="/"
            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs inline-block"
          >
            Return to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const isTimerExpired = timeLeftSeconds === 0 && currentOrder.paymentStatus === 'pending';

  // State machine steps for timeline
  const getStepStatus = (stepIndex: number) => {
    const status = currentOrder.orderStatus;
    // 0: Placed, 1: Verified, 2: Scheduled, 3: Out for Delivery, 4: Delivered
    if (stepIndex === 0) return 'completed';
    if (stepIndex === 1) {
      if (['payment_verified', 'scheduled', 'out_for_delivery', 'delivered', 'completed'].includes(status)) return 'completed';
      if (status === 'payment_review') return 'current';
      return 'pending';
    }
    if (stepIndex === 2) {
      if (['scheduled', 'out_for_delivery', 'delivered', 'completed'].includes(status)) return 'completed';
      return 'pending';
    }
    if (stepIndex === 3) {
      if (['out_for_delivery', 'delivered', 'completed'].includes(status)) return 'completed';
      return 'pending';
    }
    if (stepIndex === 4) {
      if (['delivered', 'completed'].includes(status)) return 'completed';
      return 'pending';
    }
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-light-pattern py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Tokenized Security Status Bar */}
        {currentUser?.role === 'salesperson' ? (
          <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-950 px-4 py-2.5 rounded-2xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold">Agent Preview Mode</span>
              <span className="text-emerald-700">· Order #{currentOrder.orderNumber} ({currentOrder.buyerName})</span>
            </div>
            <Link
              href="/portal/salesperson"
              className="font-bold text-emerald-900 hover:text-emerald-950 text-xs hover:underline"
            >
              ← Back to Agent Portal
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs bg-slate-100/90 text-slate-700 px-4 py-2 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">Private SMS Order Session</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              Token: {currentOrder.publicAccessToken.slice(0, 12)}••••
            </span>
          </div>
        )}

        {/* Brand & Supplier Header */}
        <div className="glass-card rounded-3xl border border-white/90 p-6 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Azwari Verified Order
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  #{currentOrder.orderNumber}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-1">
                Order for {currentOrder.buyerName}
              </h1>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span>Sold by <strong className="text-slate-800">{currentOrder.supplierName}</strong></span>
                <span className="text-slate-800 font-semibold text-[10px] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  Verified Merchant
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Total Due:</span>
              <span className="font-mono-numbers font-extrabold text-xl text-slate-900">
                ETB {currentOrder.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 15-Minute Payment Window Countdown (Shown if awaiting payment or review) */}
        {['awaiting_payment', 'payment_review'].includes(currentOrder.orderStatus) && (
          <div
            className={`rounded-3xl p-4.5 border text-xs flex items-center justify-between glass-card ${
              currentOrder.orderStatus === 'payment_review'
                ? 'bg-slate-100/80 border-slate-300 text-slate-900'
                : isTimerExpired
                ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-bold">
                  {currentOrder.orderStatus === 'payment_review'
                    ? 'Payment Evidence Under Review'
                    : isTimerExpired
                    ? 'Payment Window Expired'
                    : '15-Minute Payment Window Active'}
                </div>
                <div className="text-[11px] opacity-80">
                  {currentOrder.orderStatus === 'payment_review'
                    ? 'Merchant is comparing your reference with their statement.'
                    : isTimerExpired
                    ? 'Need more time? You can extend the window below.'
                    : 'Transfer payment and submit transaction ID before countdown ends.'}
                </div>
              </div>
            </div>

            {currentOrder.orderStatus === 'awaiting_payment' && (
              <div className="text-right shrink-0">
                {!isTimerExpired ? (
                  <div className="font-mono-numbers font-bold text-base text-amber-900">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </div>
                ) : (
                  <button
                    onClick={() => extendPaymentWindow(currentOrder.id)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    +15 Min Extension
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chapa Verification Message if returning */}
        {chapaVerificationMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{chapaVerificationMsg}</span>
            </div>
            <button onClick={() => setChapaVerificationMsg(null)} className="text-slate-400 hover:text-slate-700">
              ✕
            </button>
          </div>
        )}

        {/* Chapa Payment Card */}
        {currentOrder.paymentStatus !== 'verified' ? (
          <div className="glass-card rounded-3xl border border-white/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Pay Online with Chapa</h2>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Instant Verification
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pay securely via <strong className="text-slate-900">Telebirr</strong>, <strong className="text-slate-900">CBE Birr</strong>, or <strong className="text-slate-900">Debit / Credit Card</strong>. Your order is automatically verified upon payment—no need to upload manual receipts or bank slips.
            </p>

            {/* Payment Method Badges */}
            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-xs font-bold text-slate-800 block">Telebirr</span>
                <span className="text-[10px] text-slate-400">Mobile Wallet</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-xs font-bold text-slate-800 block">CBE Birr</span>
                <span className="text-[10px] text-slate-400">Commercial Bank</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-xs font-bold text-slate-800 block">Cards</span>
                <span className="text-[10px] text-slate-400">Visa / Mastercard</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleChapaPay}
                disabled={isCheckingOut || isVerifyingPayment}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isCheckingOut ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Redirecting to Chapa Checkout...</span>
                  </>
                ) : (
                  <>
                    <span>Pay ETB {currentOrder.totalAmount.toLocaleString()} with Chapa</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => triggerVerifyPayment(false)}
                disabled={isVerifyingPayment || isCheckingOut}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingPayment ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
                <span>{isVerifyingPayment ? 'Verifying payment with bank...' : 'Already completed payment? Check status'}</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>256-bit encrypted checkout powered by Chapa Financial Technologies</span>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-3xl border border-emerald-500/30 bg-emerald-50/50 p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-emerald-950">Payment Confirmed</h3>
                <p className="text-[11px] text-emerald-800">
                  ETB {currentOrder.totalAmount.toLocaleString()} received via verified checkout
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-900 bg-emerald-100/80 px-2.5 py-1 rounded-xl">
              Paid
            </span>
          </div>
        )}

        {/* Live Delivery Status Tracker */}
        <div className="glass-card rounded-3xl border border-white/90 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-700" />
            <span>Fulfillment & Delivery Progress</span>
          </h2>

          <div className="space-y-4 pl-2">
            {/* Step 1: Order Placed */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">Order Created by Agent</div>
                <div className="text-[11px] text-slate-500">
                  Agent: {currentOrder.salespersonName} ({currentOrder.salespersonPhone})
                </div>
              </div>
            </div>

            {/* Step 2: Payment Verified */}
            <div className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  getStepStatus(1) === 'completed'
                    ? 'bg-slate-900 text-white'
                    : getStepStatus(1) === 'current'
                    ? 'bg-slate-200 text-slate-900 font-bold'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {getStepStatus(1) === 'completed' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  '2'
                )}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">Payment Verification</div>
                <div className="text-[11px] text-slate-500">
                  {currentOrder.paymentStatus === 'verified'
                    ? 'Verified online via Chapa payment gateway'
                    : 'Awaiting Chapa online checkout'}
                </div>
              </div>
            </div>

            {/* Step 3: Delivery Scheduled */}
            <div className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  getStepStatus(2) === 'completed'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {getStepStatus(2) === 'completed' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  '3'
                )}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">Delivery Scheduled</div>
                <div className="text-[11px] text-slate-500">
                  {currentOrder.delivery.scheduledAt
                    ? `Date: ${currentOrder.delivery.preferredDate} (${currentOrder.delivery.preferredTimeSlot})`
                    : 'To be scheduled once payment is verified'}
                </div>
                {currentOrder.delivery.assignedDriverName && (
                  <div className="mt-1 p-2 bg-slate-50/80 rounded-xl border border-slate-200 text-[11px]">
                    Courier: <strong className="text-slate-800">{currentOrder.delivery.assignedDriverName}</strong> ({currentOrder.delivery.assignedDriverPhone})
                  </div>
                )}
              </div>
            </div>

            {/* Step 4: Out for Delivery */}
            <div className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  getStepStatus(3) === 'completed'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {getStepStatus(3) === 'completed' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  '4'
                )}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">Out for Delivery</div>
                <div className="text-[11px] text-slate-500">
                  Heading to {currentOrder.delivery.subcity}: {currentOrder.delivery.specificAddress}
                </div>
              </div>
            </div>

            {/* Step 5: Delivered */}
            <div className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  getStepStatus(4) === 'completed'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {getStepStatus(4) === 'completed' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  '5'
                )}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">Delivered & Confirmed</div>
                <div className="text-[11px] text-slate-500">
                  {currentOrder.orderStatus === 'delivered' || currentOrder.orderStatus === 'completed'
                    ? 'Package handed over successfully'
                    : 'Awaiting courier arrival'}
                </div>
              </div>
            </div>
          </div>

          {/* Customer confirmation button */}
          {['scheduled', 'out_for_delivery'].includes(currentOrder.orderStatus) && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleConfirmReceived}
                disabled={isConfirmingDelivery}
                className="w-full py-3.5 px-4 text-xs font-bold rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-lg shadow-emerald-600/25 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isConfirmingDelivery ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Confirming Receipt...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm I Have Received My Order</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                Clicking confirms delivery of your package and releases commission to your sales agent ({currentOrder.salespersonName}).
              </p>
            </div>
          )}

          {confirmedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs rounded-2xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Thank you! Your delivery confirmation has been saved and commissions released.</span>
            </div>
          )}
        </div>

        {/* Order Details & Summary */}
        <div className="glass-card rounded-3xl border border-white/90 p-6 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Item Summary</h2>
          <div className="space-y-3 text-xs divide-y divide-slate-100">
            {currentOrder.items.map((item, idx) => {
              const matchedProduct = products.find((p) => p.id === item.productId);
              return (
                <div key={idx} className="pt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                      <ProductImage
                        src={matchedProduct?.imageUrl}
                        alt={item.productName}
                        category={matchedProduct?.category}
                        aspectRatio="square"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{item.productName}</div>
                      <div className="text-slate-500 text-[11px]">
                        Quantity: {item.quantity} · Price: ETB {item.unitPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono-numbers font-bold text-slate-900">
                    ETB {(item.unitPrice * item.quantity).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-200/80 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Standard Delivery ({currentOrder.delivery.subcity}):</span>
              <span className="font-mono-numbers">ETB {currentOrder.deliveryFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200/80 pt-2">
              <span>Total Paid / Due:</span>
              <span className="font-mono-numbers">ETB {currentOrder.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address & Contact Card */}
        <div className="glass-card rounded-3xl border border-white/90 p-6 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Delivery Information</h2>
          <div className="text-xs space-y-1 text-slate-600">
            <div>
              <span className="text-slate-400">Recipient:</span>{' '}
              <strong className="text-slate-800">{currentOrder.buyerName}</strong> ({currentOrder.buyerPhone})
            </div>
            <div>
              <span className="text-slate-400">Destination:</span>{' '}
              {currentOrder.delivery.subcity}, Addis Ababa — {currentOrder.delivery.specificAddress}
            </div>
            {currentOrder.delivery.specialInstructions && (
              <div className="text-slate-500 italic">
                Note: "{currentOrder.delivery.specialInstructions}"
              </div>
            )}
          </div>
        </div>

        {/* Problem with order? */}
        <div className="text-center pt-2 pb-8">
          <button
            onClick={() => setShowDisputeModal(true)}
            className="text-xs text-slate-500 hover:text-rose-700 inline-flex items-center gap-1 transition-colors"
          >
            <MessageCircleQuestion className="w-3.5 h-3.5" />
            <span>Having an issue with this order? Report to platform arbitration</span>
          </button>
        </div>

        {/* Dispute Modal */}
        {showDisputeModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-modal w-full max-w-md rounded-3xl border border-white/90 p-6 space-y-4 shadow-2xl">
              <h3 className="text-sm font-bold text-slate-900">
                Report Issue with Order #{currentOrder.orderNumber}
              </h3>
              <p className="text-xs text-slate-600">
                If the merchant has not dispatched the package, or if there is a discrepancy with your Telebirr / CBE payment, Azwari arbitration will review your case.
              </p>
              <form onSubmit={handleSubmitDispute} className="space-y-3">
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what occurred with payment or delivery..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDisputeModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
