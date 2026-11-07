'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { ordersApi, telegramApi } from '../../lib/api';
import { Order, Product, PaymentMethodProvider } from '../../types';
import { 
  Building2, 
  CheckCircle2, 
  Check,
  Clock, 
  Truck, 
  DollarSign, 
  AlertCircle, 
  Plus, 
  Search, 
  ShieldCheck, 
  FileCheck, 
  ExternalLink,
  X,
  CreditCard,
  Send,
  Package,
  ShoppingCart,
  WalletCards,
  Settings,
  ChevronRight,
  TrendingUp,
  LayoutDashboard,
  Store,
  ArrowRight,
  Layers,
  Bot
} from 'lucide-react';
import { SupplierSidebar, SupplierTab } from './SupplierSidebar';
import { SupplierProductManager } from './SupplierProductManager';
import { SupplierProfileSettings } from './SupplierProfileSettings';

export const SupplierView: React.FC = () => {
  const { 
    currentUser,
    selectedSupplierId,
    setSelectedSupplierId, 
    businesses, 
    orders, 
    products, 
    commissionLedger, 
    platformFeeLedger,
    settlementBatches,
    salesPartners,
    confirmStock,
    settleCommissions,
    settlePlatformFee,
    verifyPayment, 
    scheduleDelivery, 
    dispatchOrder, 
    markOrderDelivered,
    createProduct,
    updateProduct,
    deleteProduct,
    updateBusinessProfile,
    addPaymentAccount,
    deletePaymentAccount,
    setActiveRole,
    setSelectedCustomerToken
  } = useApp();
  const { t } = useLanguage();

  // Active navigation tab (left side panel router) synchronized with URL
  const [activeTab, setActiveTabState] = useState<SupplierTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as SupplierTab;
      const validTabs: SupplierTab[] = ['overview', 'products', 'orders', 'settlement', 'accounts', 'settings'];
      if (validTabs.includes(tabParam)) return tabParam;
    }
    return 'overview';
  });

  const setActiveTab = (tab: SupplierTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (url.searchParams.get('tab') !== activeTab) {
        window.history.pushState({ tab, view: 'portal' }, '', url.toString());
      }
    }
  };

  React.useEffect(() => {
    const handleTabPop = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as SupplierTab;
      if (tabParam) {
        setActiveTabState(tabParam);
      }
      
    };
    window.addEventListener('popstate', handleTabPop);
    window.addEventListener('portal-tab-change', handleTabPop);

    

    return () => {
      window.removeEventListener('popstate', handleTabPop);
      window.removeEventListener('portal-tab-change', handleTabPop);
    };
  }, []);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openAddProductFromGlobal, setOpenAddProductFromGlobal] = useState(false);

  // Orders Tab Filter State
  const [orderFilter, setOrderFilter] = useState<'all' | 'stock_check' | 'awaiting_payment' | 'review' | 'fulfillment' | 'delivered'>('all');
  const [stockProcessingId, setStockProcessingId] = useState<string | null>(null);

  // Telegram Stock Bot Integration State
  const [telegramStatus, setTelegramStatus] = useState<{
    configured: boolean;
    isConnected: boolean;
    botUsername: string;
    telegramUsername?: string;
    connectUrl: string;
  }>({
    configured: false,
    isConnected: false,
    botUsername: 'AzwariMerchantBot',
    connectUrl: '',
  });
  
  // Verification Modal State
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Delivery Scheduling Modal State
  const [schedulingOrder, setSchedulingOrder] = useState<Order | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('+251 9');
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [timeSlot, setTimeSlot] = useState('2:00 PM - 5:00 PM');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Settle Commission Modal State
  const [settlingAgentId, setSettlingAgentId] = useState<string | null>(null);
  const [settleMethod, setSettleMethod] = useState<'Telebirr B2C' | 'CBE Direct Transfer' | 'Awash Bank Transfer'>('Telebirr B2C');
  const [payoutReference, setPayoutReference] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);
  // Payout Screenshot for Agent Settlement
  const [payoutScreenshotUrl, setPayoutScreenshotUrl] = useState('');
  const [uploadingPayoutScreenshot, setUploadingPayoutScreenshot] = useState(false);

  // Settle Platform Fee (20%) Modal State
  const [showPlatformFeeModal, setShowPlatformFeeModal] = useState(false);
  const [platformFeeMethod, setPlatformFeeMethod] = useState<'Telebirr SuperApp Till' | 'Commercial Bank of Ethiopia (CBE)'>('Telebirr SuperApp Till');
  const [platformFeeReference, setPlatformFeeReference] = useState('');
  const [platformFeeScreenshotUrl, setPlatformFeeScreenshotUrl] = useState('');
  const [uploadingPlatformFeeScreenshot, setUploadingPlatformFeeScreenshot] = useState(false);
  const [settlingPlatformFee, setSettlingPlatformFee] = useState(false);

  // File upload helper for settlement screenshots
  const handleScreenshotFile = (
    file: File,
    setter: (url: string) => void,
    loadingSetter: (loading: boolean) => void
  ) => {
    if (!file) return;
    loadingSetter(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await ordersApi.uploadReceiptImage(base64, file.name, 'SETTLEMENT');
          if (res.success && res.imageUrl) {
            setter(res.imageUrl);
          } else {
            setter(base64);
          }
        } catch {
          setter(base64);
        } finally {
          loadingSetter(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      loadingSetter(false);
    }
  };


  // Current Supplier Profile Resolution - strict user-scoped resolution only
  const targetSupplierId = currentUser?.supplierId || selectedSupplierId;
  const currentSupplier = (targetSupplierId ? businesses.find((b) => b.id === targetSupplierId) : null) || {
    id: targetSupplierId || 'biz_' + (currentUser?.id || 'default'),
    name: currentUser?.name || 'Merchant Supplier Store',
    tradeName: 'Pending Activation',
    tinNumber: 'Pending',
    licenseNumber: 'Pending',
    verificationStatus: 'verified' as const,
    city: 'Addis Ababa',
    subcity: currentUser?.subcity || 'Bole',
    specificLocation: 'Addis Ababa',
    phone: currentUser?.phone || '',
    contactEmail: currentUser?.email || '',
    commissionReserveBalance: 0,
    subscriptionPlan: 'business_growth' as const,
    subscriptionStatus: 'active' as const,
    subscriptionRenewalDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    paymentAccounts: [],
  };

      const supplierOrders = orders.filter((o) => o.supplierId === currentSupplier.id);
  const supplierProducts = products.filter((p) => p.supplierId === currentSupplier.id);
  const supplierCommissions = commissionLedger.filter((c) => c.supplierId === currentSupplier.id);
  const supplierFees = platformFeeLedger.filter((f) => f.supplierId === currentSupplier.id);

  // Total products counts
  const totalProductsCount = supplierProducts.length;
  const activeProductsCount = supplierProducts.filter((p) => p.status === 'active' || p.isActive !== false).length;

  // Money received (verified, fulfillment, or completed orders)
  const fulfilledOrders = supplierOrders.filter((o) =>
    ['payment_verified', 'scheduled', 'out_for_delivery', 'delivered', 'completed'].includes(o.orderStatus)
  );
  const totalMoneyReceived = fulfilledOrders.reduce(
    (sum, o) => sum + (o.supplierNetPayout ?? (o.totalAmount - (o.agreedCommissionAmount || 0))),
    0
  );
  const totalGrossReceived = fulfilledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const ordersAwaitingStock = supplierOrders.filter((o) => o.orderStatus === 'awaiting_verification');

  // Load Telegram Bot Connection Status
  React.useEffect(() => {
    if (currentSupplier?.id) {
      telegramApi.getStatus(currentSupplier.id).then((res) => {
        if (res.success) {
          setTelegramStatus({
            configured: res.configured,
            isConnected: res.isConnected,
            botUsername: res.botUsername || 'AzwariMerchantBot',
            telegramUsername: res.telegramUsername,
            connectUrl: res.connectUrl || `https://t.me/${res.botUsername || 'AzwariMerchantBot'}?start=biz_${currentSupplier.id}`,
          });
        }
      }).catch(() => {});
    }
  }, [currentSupplier?.id]);

  const handleConfirmStock = async (orderId: string, decision: 'confirm' | 'reject') => {
    setStockProcessingId(orderId);
    try {
      const res = await confirmStock(orderId, decision);
      if (res.success) {
        if (decision === 'confirm') {
          setOrderActionNotice('In-store physical stock confirmed! Official payment instructions dispatched to the buyer.');
        } else {
          setOrderActionNotice('Marked out of stock. Order cancelled silently and customer was shielded from notifications.');
        }
      } else {
        alert(res.message || 'Failed to update stock confirmation');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating stock confirmation');
    } finally {
      setStockProcessingId(null);
    }
  };

  // Filtered orders
  const filteredOrders = supplierOrders.filter((o) => {
    if (orderFilter === 'stock_check') return o.orderStatus === 'awaiting_verification';
    if (orderFilter === 'awaiting_payment') return o.orderStatus === 'awaiting_payment';
    if (orderFilter === 'review') return o.orderStatus === 'payment_review';
    if (orderFilter === 'fulfillment')
      return ['payment_verified', 'scheduled', 'out_for_delivery'].includes(o.orderStatus);
    if (orderFilter === 'delivered') return ['delivered', 'completed'].includes(o.orderStatus);
    return true;
  });

  const ordersNeedingVerification = supplierOrders.filter((o) => o.orderStatus === 'payment_review');
  const eligibleCommissions = supplierCommissions.filter((c) => c.status === 'eligible');
  const totalEligibleOwed = eligibleCommissions.reduce((sum, c) => sum + c.amount, 0);
  // Calculate 20% platform cut for all delivered orders
  const deliveredOrdersForPlatformFee = supplierOrders.filter((o) => ['delivered', 'completed'].includes(o.orderStatus));
  const totalDeliveredGrossCommissions = deliveredOrdersForPlatformFee.reduce((sum, o) => sum + (Number(o.agreedCommissionAmount) || 0), 0);
  const totalPlatformCutDue = Math.round(totalDeliveredGrossCommissions * 0.20 * 100) / 100;


  // Group eligible commissions by salesperson
  const commissionsByAgent: Record<
    string,
    {
      agentId: string;
      agentName: string;
      phone?: string;
      payoutProvider: string;
      payoutAccount: string;
      payoutAccountName: string;
      totalGrossAmount: number;
      netPayoutAmount: number;
      platformFeeAmount: number;
      entries: typeof eligibleCommissions;
    }
  > = {};

  eligibleCommissions.forEach((entry) => {
    if (!commissionsByAgent[entry.salespersonId]) {
      const partner = salesPartners.find((sp) => sp.id === entry.salespersonId);
      commissionsByAgent[entry.salespersonId] = {
        agentId: entry.salespersonId,
        agentName: entry.salespersonName,
        phone: partner?.phone,
        payoutProvider: partner?.payoutDestination?.provider || 'Telebirr',
        payoutAccount: partner?.payoutDestination?.accountNumber || partner?.phone || 'N/A',
        payoutAccountName: partner?.payoutDestination?.accountHolderName || partner?.fullName || entry.salespersonName,
        totalGrossAmount: 0,
        netPayoutAmount: 0,
        platformFeeAmount: 0,
        entries: [],
      };
    }
    commissionsByAgent[entry.salespersonId].totalGrossAmount += entry.amount;
    commissionsByAgent[entry.salespersonId].netPayoutAmount += Math.round(entry.amount * 0.8 * 100) / 100;
    commissionsByAgent[entry.salespersonId].platformFeeAmount += Math.round(entry.amount * 0.2 * 100) / 100;
    commissionsByAgent[entry.salespersonId].entries.push(entry);
  });

  // Success feedback notice for merchant actions
  const [orderActionNotice, setOrderActionNotice] = useState<string | null>(null);

  const handleConfirmPayment = (orderId: string) => {
    verifyPayment(orderId, true);
    const ord = orders.find((o) => o.id === orderId);
    setVerifyingOrder(null);
    setShowRejectInput(false);

    // Switch filter to fulfillment so the order doesn't vanish
    setOrderFilter('fulfillment');

    // Immediately open driver dispatch modal for this verified order
    if (ord) {
      setSchedulingOrder(ord);
    }
  };

  const handleRejectPayment = (orderId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please specify a rejection reason for the customer.');
      return;
    }
    verifyPayment(orderId, false, rejectionReason);
    setVerifyingOrder(null);
    setShowRejectInput(false);
    setRejectionReason('');
    setOrderActionNotice('Payment evidence rejected. Customer notified via SMS to re-upload.');
    setTimeout(() => setOrderActionNotice(null), 5000);
  };

  const handleSaveDeliverySchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingOrder) return;

    // 1. Assign driver and schedule
    scheduleDelivery(schedulingOrder.id, {
      assignedDriverName: driverName,
      assignedDriverPhone: driverPhone,
      scheduledDate: deliveryDate,
      scheduledTimeSlot: timeSlot,
      notes: deliveryNotes,
    });

    // 2. Dispatch order immediately to driver!
    dispatchOrder(schedulingOrder.id);

    setOrderActionNotice(
      `Order #${schedulingOrder.orderNumber} verified and dispatched to driver ${driverName} (${driverPhone})! Customer notified via SMS.`
    );
    setTimeout(() => setOrderActionNotice(null), 6000);

    setSchedulingOrder(null);
    setDriverName('');
    setDeliveryNotes('');
  };

  const handleExecutePlatformFeeSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformFeeReference.trim()) {
      alert('Please enter your transaction reference slip code.');
      return;
    }

    setSettlingPlatformFee(true);
    try {
      if (settlePlatformFee) {
        await settlePlatformFee(platformFeeMethod, platformFeeReference.trim(), platformFeeScreenshotUrl || undefined, totalPlatformCutDue);
      }
      setShowPlatformFeeModal(false);
      setPlatformFeeReference('');
      setPlatformFeeScreenshotUrl('');
      setOrderActionNotice(
        `Platform fee settlement recorded successfully! ETB ${totalPlatformCutDue.toLocaleString()} paid to Azwari (Ref: ${platformFeeReference.trim()}).`
      );
      setTimeout(() => setOrderActionNotice(null), 8000);
    } catch (err: any) {
      alert(err.message || 'Failed to record platform fee settlement.');
    } finally {
      setSettlingPlatformFee(false);
    }
  };

  const handleExecuteSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingAgentId || !payoutReference.trim()) {
      alert('Please provide the transaction reference slip code.');
      return;
    }

    const agentGroup = commissionsByAgent[settlingAgentId];
    if (!agentGroup) return;

    const entryIds = agentGroup.entries.map((e) => e.id);
    setSettleSubmitting(true);
    try {
      await settleCommissions(settlingAgentId, entryIds, settleMethod, payoutReference.trim(), payoutScreenshotUrl || undefined);
      setSettlingAgentId(null);
      setPayoutReference('');
      setPayoutScreenshotUrl('');
      setOrderActionNotice(
        `Audited Settlement Batch recorded successfully! ETB ${agentGroup.netPayoutAmount.toLocaleString()} paid to ${agentGroup.agentName} (Ref: ${payoutReference.trim()}).`
      );
      setTimeout(() => setOrderActionNotice(null), 8000);
    } catch (err: any) {
      alert(err.message || 'Failed to record settlement batch.');
    } finally {
      setSettleSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Mobile Top Header Bar */}
      <div className="lg:hidden flex items-center justify-between mb-4 glass-card p-3 rounded-2xl border border-white/90">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200/80 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>Merchant Console</span>
        </div>

        <div className="flex items-center gap-2 text-right">
          <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
            {currentSupplier.name}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Main Flex Layout: Left Sidebar + Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side Panel Navigation */}
        <SupplierSidebar
          currentSupplier={currentSupplier}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          productsCount={supplierProducts.length}
          ordersCount={supplierOrders.length}
          ordersNeedingVerificationCount={ordersNeedingVerification.length}
          settlementDueCount={Object.keys(commissionsByAgent).length}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 w-full min-w-0">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Overview Header */}
              <div className="glass-card rounded-3xl border border-white/90 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900">Welcome, {currentSupplier.name}</h1>
                    <span className="text-xs text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md font-semibold border border-slate-200">
                      {t('supplier.hubTitle')}
              </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    TIN: <span className="font-mono font-semibold text-slate-700">{currentSupplier.tinNumber}</span> · Subcity: <span className="font-semibold text-slate-700">{currentSupplier.subcity}</span> · Addis Ababa
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('products')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    <span>Manage Products ({supplierProducts.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                    title="Store Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Operational KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div 
                  onClick={() => setActiveTab('products')}
                  className="glass-card-hover p-5 rounded-3xl border border-white/90 cursor-pointer"
                >
                  <span className="text-xs text-slate-500 block mb-1">{t('supplier.activeProducts')}</span>
                  <div className="font-mono-numbers font-bold text-xl text-slate-900">
                    {totalProductsCount}
                  </div>
                  <span className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                    {activeProductsCount} active in catalog →
                  </span>
                </div>

                <div 
                  onClick={() => setActiveTab('orders')}
                  className="glass-card-hover p-5 rounded-3xl border border-white/90 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 block">{t('supplier.totalSalesVolume')}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Net</span>
                  </div>
                  <div className="font-mono-numbers font-bold text-xl text-emerald-700">
                    ETB {totalMoneyReceived.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block truncate">
                    Gross: ETB {totalGrossReceived.toLocaleString()} →
                  </span>
                </div>

                <div 
                  onClick={() => setActiveTab('orders')}
                  className="glass-card-hover p-5 rounded-3xl border border-white/90 cursor-pointer"
                >
                  <span className="text-xs text-slate-500 block mb-1">{t('supplier.pendingVerifications')}</span>
                  <div className="font-mono-numbers font-bold text-xl text-amber-700 flex items-center gap-2">
                    <span>{ordersNeedingVerification.length}</span>
                    {ordersNeedingVerification.length > 0 && (
                      <span className="text-[10px] font-sans font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                        Action Required
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Review receipts →
                  </span>
                </div>

                <div 
                  onClick={() => setActiveTab('settlement')}
                  className="glass-card-hover p-5 rounded-3xl border border-indigo-500/30 cursor-pointer bg-gradient-to-br from-white via-white to-indigo-50/40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 block">{t('supplier.commissionSettlement')}</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">80% Net</span>
                  </div>
                  <div className="font-mono-numbers font-bold text-xl text-slate-900">
                    ETB {Math.round(totalEligibleOwed * 0.8).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-indigo-700 font-bold mt-1 flex items-center gap-1">
                    {Object.keys(commissionsByAgent).length > 0 ? `${Object.keys(commissionsByAgent).length} payouts ready →` : 'All settled →'}
                  </span>
                </div>
              </div>

              {/* Action Banner if orders need physical stock check */}
              {ordersAwaitingStock.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {ordersAwaitingStock.length}
                    </div>
                    <div>
                      <div className="font-bold text-xs flex items-center gap-2">
                        <span>Physical Stock Verification Needed</span>
                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Customer Shielded
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        {ordersAwaitingStock.length} order(s) submitted by sales agents. Please physically confirm items before payment links are released to customers.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('orders');
                      setOrderFilter('stock_check');
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shrink-0 flex items-center gap-1.5 transition-colors"
                  >
                    <span>Check & Hold Items</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Telegram Bot Live Connect Card */}
              <div className="glass-card rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-50/70 via-white to-slate-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Telegram 1-Tap Stock Bot (@{telegramStatus.botUsername})</h3>
                      {telegramStatus.isConnected ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" />
                          <span>Connected {telegramStatus.telegramUsername ? `@${telegramStatus.telegramUsername}` : ''}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {telegramStatus.isConnected 
                        ? 'Your shop is connected! You receive live interactive stock verification requests directly on Telegram.'
                        : 'Connect your store to receive instant 1-tap stock checks directly on your phone whenever an agent places an order.'}
                    </p>
                  </div>
                </div>

                <a
                  href={telegramStatus.connectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 transition-colors shadow-2xs ${
                    telegramStatus.isConnected
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      : 'bg-sky-500 hover:bg-sky-600 text-slate-950 font-extrabold'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{telegramStatus.isConnected ? 'Open Telegram Bot' : 'Connect Telegram Bot'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Action Banner if orders need verification */}
              {ordersNeedingVerification.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">
                        {ordersNeedingVerification.length} customer payment receipt{ordersNeedingVerification.length > 1 ? 's' : ''} awaiting merchant verification!
                      </div>
                      <div className="text-[11px] text-amber-800">
                        Check your bank statement against submitted reference numbers to approve dispatch.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('orders');
                      setOrderFilter('review');
                    }}
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl shrink-0"
                  >
                    Review Receipts Now
                  </button>
                </div>
              )}

              {/* Quick Jump Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Catalog Snapshot */}
                <div className="glass-card rounded-3xl border border-white/90 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-700" />
                      Product Catalog Preview
                    </h3>
                    <button
                      onClick={() => setActiveTab('products')}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                    >
                      View All ({supplierProducts.length}) <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {supplierProducts.slice(0, 3).map((p) => (
                      <div key={p.id} className="p-3 rounded-2xl glass-card-subtle flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500">{p.category} · Stock: {p.stock} units</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono-numbers font-bold text-xs text-slate-900">
                            ETB {p.unitPrice.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-amber-700 font-semibold">
                            {p.commissionTerms?.type === 'fixed_per_unit'
                              ? `ETB ${p.commissionTerms.rateOrAmount}/unit`
                              : `${p.commissionTerms?.rateOrAmount || 12}%`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Verified Sales Snapshot */}
                <div className="glass-card rounded-3xl border border-white/90 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-slate-700" />
                      Recent Verified Sales
                    </h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                    >
                      View All Orders ({supplierOrders.length}) <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {fulfilledOrders.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs glass-card-subtle rounded-2xl">
                      No verified customer orders yet. Orders will appear here once customers submit payments.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {fulfilledOrders.slice(0, 3).map((order) => (
                        <div key={order.id} className="p-3 rounded-2xl glass-card-subtle flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs text-slate-900">
                              Order #{order.orderNumber}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {order.buyerName} · {order.items.length} item(s)
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono-numbers font-bold text-xs text-emerald-700">
                              +ETB {(order.supplierNetPayout ?? (order.totalAmount - (order.agreedCommissionAmount || 0))).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {order.orderStatus.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FULL CRUD PRODUCT MANAGER */}
          {activeTab === 'products' && (
            <SupplierProductManager
              products={supplierProducts}
              currentSupplier={currentSupplier}
              onCreateProduct={createProduct}
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
              showAddModalInitially={openAddProductFromGlobal}
              onCloseInitialAddModal={() => setOpenAddProductFromGlobal(false)}
            />
          )}

          {/* TAB 3: ORDERS & FULFILLMENT MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orderActionNotice && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{orderActionNotice}</span>
                  </div>
                  <button onClick={() => setOrderActionNotice(null)} className="text-emerald-700 hover:text-emerald-900">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="glass-card rounded-3xl border border-white/90 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Orders & Fulfillment Pipeline</h2>
                    <p className="text-xs text-slate-500">
                      Verify customer payment evidence against your bank accounts, assign drivers, and mark deliveries.
                    </p>
                  </div>

                  {/* Order Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs border border-slate-200 overflow-x-auto">
                    <button
                      onClick={() => setOrderFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        orderFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      All ({supplierOrders.length})
                    </button>
                    <button
                      onClick={() => setOrderFilter('stock_check')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                        orderFilter === 'stock_check' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Stock Check</span>
                      {ordersAwaitingStock.length > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {ordersAwaitingStock.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setOrderFilter('review')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        orderFilter === 'review' ? 'bg-amber-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Needs Verification ({ordersNeedingVerification.length})
                    </button>
                    <button
                      onClick={() => setOrderFilter('fulfillment')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        orderFilter === 'fulfillment' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      In Fulfillment
                    </button>
                    <button
                      onClick={() => setOrderFilter('delivered')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        orderFilter === 'delivered' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Delivered
                    </button>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4">Order Ref</th>
                          <th className="py-3 px-4">Customer & Location</th>
                          <th className="py-3 px-4">Sales Agent</th>
                          <th className="py-3 px-4 text-right">Order Amount</th>
                          <th className="py-3 px-4">Payment Evidence</th>
                          <th className="py-3 px-4">Order Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-500">
                              No orders in this state filter.
                            </td>
                          </tr>
                        ) : (
                          filteredOrders.map((order) => {
                            return (
                              <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                                  {order.orderNumber}
                                  <span className="block text-[11px] text-slate-400 font-sans">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-slate-800">{order.buyerName}</div>
                                  <div className="font-mono text-slate-500 text-[11px]">{order.buyerPhone}</div>
                                  <div className="text-slate-500 text-[10px]">{order.delivery.subcity}: {order.delivery.specificAddress}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-medium text-slate-800">{order.salespersonName}</div>
                                  <span className="text-[10px] text-slate-900 font-mono font-medium">
                                    Commission: ETB {order.agreedCommissionAmount.toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="font-mono-numbers font-bold text-slate-900">
                                    ETB {order.totalAmount.toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Net: ETB {order.supplierNetPayout.toLocaleString()}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  {order.evidence ? (
                                    <div className="flex items-start gap-2">
                                      {order.evidence.receiptMockImage && (
                                        <a
                                          href={order.evidence.receiptMockImage}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity mt-0.5"
                                          title="View payment screenshot"
                                        >
                                          <img
                                            src={order.evidence.receiptMockImage}
                                            alt="Receipt"
                                            className="w-full h-full object-cover"
                                          />
                                        </a>
                                      )}
                                      <div>
                                        <span className="font-mono text-xs font-semibold text-slate-900 block">
                                          {order.evidence.transactionReference}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                          {order.evidence.provider} · ETB {order.evidence.amountShown.toLocaleString()}
                                        </span>
                                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5 border ${
                                          order.evidence.verifierStatus === 'verified'
                                            ? 'bg-slate-100 text-slate-900 border-slate-300'
                                            : order.evidence.verifierStatus === 'rejected'
                                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}>
                                          {order.evidence.verifierStatus}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">No receipt yet</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  {order.orderStatus === 'awaiting_verification' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                                      <Clock className="w-3 h-3 text-amber-700" />
                                      <span>CHECK IN-STORE STOCK</span>
                                    </span>
                                  ) : order.orderStatus === 'cancelled_out_of_stock' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md">
                                      <span>SOLD OUT IN SHOP</span>
                                    </span>
                                  ) : (
                                    <span className="font-semibold text-slate-800 block text-xs">
                                      {order.orderStatus.replace('_', ' ').toUpperCase()}
                                    </span>
                                  )}
                                  {order.delivery.assignedDriverName && (
                                    <span className="text-[10px] text-slate-500 block">
                                      Driver: {order.delivery.assignedDriverName}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    {order.orderStatus === 'awaiting_verification' && (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleConfirmStock(order.id, 'confirm')}
                                          disabled={stockProcessingId === order.id}
                                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs flex items-center gap-1 disabled:opacity-50"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Confirm Stock</span>
                                        </button>
                                        <button
                                          onClick={() => handleConfirmStock(order.id, 'reject')}
                                          disabled={stockProcessingId === order.id}
                                          className="px-2 py-1.5 bg-slate-100 hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-300 font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
                                          title="Mark Out of Stock (Customer Shielded)"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}

                                    {order.orderStatus === 'cancelled_out_of_stock' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-md text-[11px] font-semibold">
                                        Sold Out (Shielded)
                                      </span>
                                    )}

                                    {order.orderStatus === 'payment_review' && (
                                      <button
                                        onClick={() => setVerifyingOrder(order)}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs shadow-xs"
                                      >
                                        Verify Slip
                                      </button>
                                    )}

                                    {order.orderStatus === 'payment_verified' && (
                                      <button
                                        onClick={() => setSchedulingOrder(order)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs shadow-xs"
                                      >
                                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Assign Driver & Dispatch</span>
                                      </button>
                                    )}

                                    {order.orderStatus === 'scheduled' && (
                                      <button
                                        onClick={() => dispatchOrder(order.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs shadow-xs"
                                      >
                                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Dispatch to Driver</span>
                                      </button>
                                    )}

                                    {order.orderStatus === 'out_for_delivery' && (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-semibold">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Awaiting Customer Receipt</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMMISSION SETTLEMENT ENGINE */}
          {activeTab === 'settlement' && (
            <div className="space-y-7">
              {/* Header Card */}
              <div className="glass-card rounded-3xl border border-white/90 p-7 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                      <WalletCards className="w-6 h-6 text-indigo-600" />
                      Sales Agent Commission Settlement Engine
                    </h2>
                    <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
                      When orders are delivered and verified by customers, agent commissions unlock into &quot;eligible&quot; status. Merchants transfer the 80% net payout directly to the agent&apos;s Telebirr or CBE account, with 20% platform marketplace fee accounted for.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs shrink-0">
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-bold rounded-xl border border-emerald-200 shadow-2xs">
                      80% Agent Net Payout
                    </span>
                    <span className="px-3 py-1.5 bg-indigo-50 text-indigo-800 font-bold rounded-xl border border-indigo-200 shadow-2xs">
                      20% Platform Fee
                    </span>
                  </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                  {/* Card 1: 80% Net Owed to Sales Agents */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Net Owed to Agents (80%)</span>
                      <span className="text-2xl font-extrabold font-mono text-slate-900 block mt-1">
                        ETB {(Math.round(totalEligibleOwed * 0.8)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-slate-400 block mt-1">
                        Gross completed: ETB {totalEligibleOwed.toLocaleString()} · {Object.keys(commissionsByAgent).length} agent(s) due
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 mt-3 inline-block self-start">
                      Direct CBE / Telebirr Transfers
                    </span>
                  </div>

                  {/* Card 2: Unpaid Platform Fee (20%) */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-white border border-indigo-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">{t('supplier.unpaidPlatformFee')}</span>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Azwari Cut</span>
                      </div>
                      <span className="text-2xl font-extrabold font-mono text-indigo-950 block mt-1">
                        ETB {totalPlatformCutDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-slate-500 block mt-1">
                        Retained marketplace share on delivered orders
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPlatformFeeModal(true)}
                      disabled={totalPlatformCutDue <= 0}
                      className="mt-3 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white disabled:opacity-40 transition-colors shadow-2xs flex items-center justify-between cursor-pointer"
                    >
                      <span>{t('supplier.payPlatformFee')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Card 3: Historical Audited Batches */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Settlement Batches Audited</span>
                      <span className="text-2xl font-extrabold font-mono text-emerald-800 block mt-1">
                        {settlementBatches.length} batch(es)
                      </span>
                      <span className="text-xs text-slate-400 block mt-1">
                        Total settled: ETB {settlementBatches.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 mt-3 inline-block self-start">
                      Permanent Slip Audit Trail
                    </span>
                  </div>
                </div>
              </div>

              {/* Outstanding Obligations - Spacious Table */}
              <div className="glass-card rounded-3xl border border-white/90 p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Eligible Obligations Grouped by Sales Agent
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Completed customer deliveries awaiting your direct commission settlement.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded-full font-bold">
                    {Object.keys(commissionsByAgent).length} agent(s) due
                  </span>
                </div>

                {Object.keys(commissionsByAgent).length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs glass-card-subtle rounded-3xl border border-slate-200">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-90" />
                    <p className="font-bold text-slate-900 text-base">All commissions are fully settled!</p>
                    <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                      There are no outstanding commission obligations for your delivered orders. Excellent job keeping up with partner settlements!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/70 shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200/90 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-4 px-6 min-w-[200px]">Sales Agent</th>
                          <th className="py-4 px-6 min-w-[220px]">Payout Account</th>
                          <th className="py-4 px-6 min-w-[170px]">Delivered Orders</th>
                          <th className="py-4 px-6 min-w-[140px] text-right">Gross Commission</th>
                          <th className="py-4 px-6 min-w-[160px] text-right">Net To Pay (80%)</th>
                          <th className="py-4 px-6 min-w-[140px] text-right">Platform Fee (20%)</th>
                          <th className="py-4 px-6 min-w-[160px] text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {Object.values(commissionsByAgent).map((group) => (
                          <tr key={group.agentId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-900 text-sm">{group.agentName}</div>
                              {group.phone && (
                                <div className="text-xs font-mono text-slate-500 mt-1">{group.phone}</div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-semibold text-slate-800 flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-200">
                                  {group.payoutProvider}
                                </span>
                                <span className="font-mono text-slate-900 font-bold">{group.payoutAccount}</span>
                              </div>
                              {group.payoutAccountName && (
                                <div className="text-[11px] text-slate-400 mt-1">{group.payoutAccountName}</div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-semibold text-slate-800">{group.entries.length} completed order(s)</span>
                              <div className="font-mono text-[11px] text-slate-500 mt-1 truncate max-w-[160px]" title={group.entries.map((e) => e.orderNumber).join(', ')}>
                                {group.entries.map((e) => e.orderNumber).join(', ')}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right font-mono text-slate-600 font-semibold text-xs">
                              ETB {group.totalGrossAmount.toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <span className="font-mono font-bold text-base text-rose-700">
                                ETB {group.netPayoutAmount.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-mono text-slate-500 text-xs">
                              ETB {group.platformFeeAmount.toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => {
                                  setSettlingAgentId(group.agentId);
                                  setPayoutReference('');
                                }}
                                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs inline-flex items-center justify-center gap-1.5"
                              >
                                <span>Settle 80%</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Settlement History / Audit Trail - Spacious Table */}
              <div className="glass-card rounded-3xl border border-white/90 p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      Settlement History & Audit Trail
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Immutable transaction logs and bank slip records for all executed commission payouts.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded-full font-bold">
                    {settlementBatches.length} batch(es) recorded
                  </span>
                </div>

                {settlementBatches.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs glass-card-subtle rounded-3xl border border-slate-200">
                    No historical settlement batches yet. Settled batches will appear here with permanent reference slips.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/70 shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200/90 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-4 px-6 min-w-[170px]">Batch Number</th>
                          <th className="py-4 px-6 min-w-[180px]">Sales Agent</th>
                          <th className="py-4 px-6 min-w-[160px] text-right">Net Paid (80%)</th>
                          <th className="py-4 px-6 min-w-[170px]">Payment Channel</th>
                          <th className="py-4 px-6 min-w-[220px]">Reference Slip ID</th>
                          <th className="py-4 px-6 min-w-[140px]">Settled Date</th>
                          <th className="py-4 px-6 min-w-[120px]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {settlementBatches.map((batch) => (
                          <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-6 font-mono font-bold text-slate-900">{batch.batchNumber}</td>
                            <td className="py-4 px-6 font-semibold text-slate-800">{batch.recipientName}</td>
                            <td className="py-4 px-6 text-right font-mono font-bold text-emerald-700 text-sm">
                              ETB {batch.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-6 text-slate-700 font-medium">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-[11px] font-semibold border border-slate-200">
                                {batch.payoutMethod}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {(() => {
                                const raw = batch.transactionReference || '';
                                const parts = raw.split(' | ');
                                const code = parts[0] || 'N/A';
                                const slipUrl = parts[1];
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono bg-slate-100 text-slate-900 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200">
                                      {code}
                                    </span>
                                    {slipUrl && (
                                      <a
                                        href={slipUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1 shrink-0"
                                      >
                                        <span>Slip</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                              {new Date(batch.settledAt || batch.id).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
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
          )}

          {/* TAB 5: PAYMENT RECEIVING ACCOUNTS */}
          {activeTab === 'accounts' && (
            <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Verified Payment Destination Accounts</h2>
                  <p className="text-xs text-slate-500">
                    Customers receive these verified account numbers in their SMS order instructions to make bank transfers or Telebirr payments.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                >
                  Manage in Settings →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSupplier.paymentAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-2xl border border-slate-200/80 glass-card-subtle space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{acc.provider}</span>
                        {acc.isPrimary && (
                          <span className="text-[10px] font-semibold bg-slate-900 text-white px-2 py-0.5 rounded-md">
                            Primary
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                      </span>
                    </div>
                    <div className="font-mono font-bold text-slate-800 text-sm">
                      {acc.accountNumber}
                    </div>
                    <div className="text-xs text-slate-500">Account Holder: {acc.accountHolderName}</div>
                    {acc.instructions && (
                      <div className="text-[11px] text-slate-400 italic">"{acc.instructions}"</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS & BUSINESS PROFILE */}
          {activeTab === 'settings' && (
            <SupplierProfileSettings
              currentSupplier={currentSupplier}
              onUpdateProfile={updateBusinessProfile}
              onAddPaymentAccount={addPaymentAccount}
              onDeletePaymentAccount={deletePaymentAccount}
            />
          )}
        </main>
      </div>

      {/* ============================================================ */}
      {/* MODAL: VERIFY CUSTOMER PAYMENT EVIDENCE */}
      {/* ============================================================ */}
      {verifyingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="glass-modal w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl border border-white/90 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-md shrink-0">
              <h3 className="text-sm font-bold text-slate-900">
                {t('supplier.reviewSlipTitle')}
              </h3>
              <button
                onClick={() => setVerifyingOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="p-4 glass-card rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Ref:</span>
                  <span className="font-mono font-bold text-slate-900">{verifyingOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Name:</span>
                  <span className="font-semibold text-slate-800">{verifyingOrder.buyerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Due:</span>
                  <span className="font-mono-numbers font-bold text-slate-900">
                    ETB {verifyingOrder.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 pt-2">
                  <span className="text-slate-500">Provider & Account:</span>
                  <span className="font-medium text-slate-800">
                    {verifyingOrder.selectedPaymentAccount.provider} ({verifyingOrder.selectedPaymentAccount.accountNumber})
                  </span>
                </div>
              </div>

              {verifyingOrder.evidence ? (
                <div className="p-4 glass-card-subtle border border-slate-200/80 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-slate-900 block">
                    Submitted Evidence Details
                  </span>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Transaction Reference:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {verifyingOrder.evidence.transactionReference}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Amount Transferred:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ETB {verifyingOrder.evidence.amountShown.toLocaleString()}
                    </span>
                  </div>
                  {verifyingOrder.evidence.receiptNote && (
                    <div className="text-xs text-slate-700 italic pt-1 border-t border-slate-200">
                      Note from buyer: "{verifyingOrder.evidence.receiptNote}"
                    </div>
                  )}

                  {verifyingOrder.evidence.receiptMockImage && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">Payment Screenshot Receipt:</span>
                        <a
                          href={verifyingOrder.evidence.receiptMockImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>Open full size</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-56 sm:max-h-72">
                        <img
                          src={verifyingOrder.evidence.receiptMockImage}
                          alt="Customer payment screenshot"
                          className="max-h-56 sm:max-h-72 w-full object-contain cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => window.open(verifyingOrder.evidence?.receiptMockImage, '_blank')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500">No evidence details submitted.</div>
              )}

              <div className="text-[11px] text-slate-600 flex items-start gap-1.5 p-3 glass-card-subtle border border-amber-200/80 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>Compare the above transaction reference against your actual bank or Telebirr statement before confirming. Do not approve without checking bank transaction logs.</span>
              </div>

              {showRejectInput && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Rejection Reason (will be sent to buyer via SMS):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Transaction reference TX... not found in bank records"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
              )}

              </div>
            <div className="sticky bottom-0 p-4 bg-white/95 border-t border-slate-200 backdrop-blur-md flex items-center justify-end gap-3 shrink-0 shadow-xs">
                {!showRejectInput ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50"
                    >
                      {t('supplier.rejectSlipBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmPayment(verifyingOrder.id)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      {t('supplier.verifySlipBtn')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-2 text-xs text-slate-600"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectPayment(verifyingOrder.id)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-700 hover:bg-rose-600 text-white"
                    >
                      Send Rejection SMS
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ============================================================ */}
      {/* MODAL: SCHEDULE DELIVERY */}
      {/* ============================================================ */}
      {schedulingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-lg rounded-3xl shadow-2xl border border-white/90 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/60 backdrop-blur-md">
              <h3 className="text-sm font-bold text-slate-900">
                Schedule Delivery for #{schedulingOrder.orderNumber}
              </h3>
              <button
                onClick={() => setSchedulingOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeliverySchedule} className="p-6 space-y-4">
              <div className="p-3.5 glass-card-subtle rounded-2xl text-xs space-y-1">
                <div>Recipient: <strong className="text-slate-800">{schedulingOrder.buyerName}</strong> ({schedulingOrder.buyerPhone})</div>
                <div>Destination: <span className="font-semibold text-slate-700">{schedulingOrder.delivery.subcity}</span> - {schedulingOrder.delivery.specificAddress}</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Assigned Internal Driver Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tesfaye Alemu (Motorcycle #AA-B-2910)"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Driver Phone Number * (Shared with Customer)
                </label>
                <input
                  type="text"
                  required
                  placeholder="+251 911..."
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Time Slot *</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900"
                  >
                    <option value="9:00 AM - 12:00 PM">Morning (9:00 AM - 12:00 PM)</option>
                    <option value="2:00 PM - 5:00 PM">Afternoon (2:00 PM - 5:00 PM)</option>
                    <option value="5:00 PM - 7:30 PM">Evening (5:00 PM - 7:30 PM)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSchedulingOrder(null)}
                  className="px-3.5 py-2 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                >
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Confirm & Dispatch to Driver (Send SMS)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SETTLE COMMISSION BATCH */}
      {/* ============================================================ */}
      {settlingAgentId && commissionsByAgent[settlingAgentId] && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-lg rounded-3xl shadow-2xl border border-white/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/70 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <WalletCards className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Settle Commission to Sales Agent
                </h3>
              </div>
              <button
                onClick={() => setSettlingAgentId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteSettlement} className="p-6 space-y-4">
              {/* Agent Recipient Details */}
              <div className="p-4 glass-card-subtle rounded-2xl text-xs space-y-2 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Recipient Agent:</span>
                  <span className="font-bold text-slate-900">{commissionsByAgent[settlingAgentId].agentName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payment Account:</span>
                  <span className="font-mono font-bold text-indigo-900">
                    {commissionsByAgent[settlingAgentId].payoutProvider} - {commissionsByAgent[settlingAgentId].payoutAccount}
                  </span>
                </div>
                {commissionsByAgent[settlingAgentId].payoutAccountName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Account Holder:</span>
                    <span className="font-medium text-slate-700">{commissionsByAgent[settlingAgentId].payoutAccountName}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-slate-500">Gross Commission ({commissionsByAgent[settlingAgentId].entries.length} orders):</span>
                  <span className="font-mono text-slate-700">ETB {commissionsByAgent[settlingAgentId].totalGrossAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Platform Marketplace Cut (20%):</span>
                  <span className="font-mono text-indigo-700 font-medium">ETB {commissionsByAgent[settlingAgentId].platformFeeAmount.toLocaleString()}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between font-bold text-sm">
                  <span className="text-emerald-900">Net To Transfer to Agent (80%):</span>
                  <span className="font-mono text-emerald-700 text-base">
                    ETB {commissionsByAgent[settlingAgentId].netPayoutAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payout Channel Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Settlement Channel *
                </label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value as any)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Telebirr B2C">Telebirr B2C / Direct Mobile Transfer</option>
                  <option value="CBE Direct Transfer">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="Awash Bank Transfer">Awash Bank Direct Transfer</option>
                </select>
              </div>

              {/* Transaction Slip Code Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Bank / Telebirr Transaction Slip / Reference ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TB-B2C-992819401 or CBE FT263910..."
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 font-mono focus:ring-2 focus:ring-slate-900"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Transfer ETB {commissionsByAgent[settlingAgentId].netPayoutAmount.toLocaleString()} directly to the agent, then paste the official receipt or transaction reference code here. This permanently audits the payout.
                </span>
              </div>
              {/* Transfer Receipt Screenshot (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Payment Transfer Screenshot (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPayoutScreenshot}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleScreenshotFile(file, setPayoutScreenshotUrl, setUploadingPayoutScreenshot);
                    }}
                    className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                  {uploadingPayoutScreenshot && (
                    <span className="text-xs text-indigo-600 font-semibold animate-pulse">Uploading slip...</span>
                  )}
                </div>
                {payoutScreenshotUrl && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium truncate">Transfer screenshot attached</span>
                    <a
                      href={payoutScreenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto underline text-emerald-700 font-bold shrink-0 flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettlingAgentId(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleSubmitting}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{settleSubmitting ? 'Recording Batch...' : 'Record Audited Settlement Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Platform Fee (20%) Modal */}
      {showPlatformFeeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-lg rounded-3xl shadow-2xl border border-white/90 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Settle 20% Platform Fee to Azwari
                </h3>
              </div>
              <button
                onClick={() => setShowPlatformFeeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePlatformFeeSettlement} className="p-6 space-y-4">
              {/* Azwari Official Bank Account Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-200 font-semibold">Official Platform Account</span>
                  <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-400/20">
                    Azwari Technology
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-indigo-200">Telebirr SuperApp Till: <span className="font-mono font-bold text-white">0931418513</span></div>
                  <div className="text-xs text-indigo-200">CBE Commercial Bank: <span className="font-mono font-bold text-white">1000481928471</span></div>
                  <div className="text-[11px] text-indigo-300">Account Name: <span className="font-semibold text-white">Azwari Digital Marketplace</span></div>
                </div>
                <div className="pt-2 border-t border-indigo-700/60 flex items-center justify-between font-bold text-sm">
                  <span className="text-indigo-200 text-xs">Platform Fee Due:</span>
                  <span className="font-mono text-emerald-400 text-base">ETB {totalPlatformCutDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Settlement Channel */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Transfer Channel *
                </label>
                <select
                  value={platformFeeMethod}
                  onChange={(e) => setPlatformFeeMethod(e.target.value as any)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Telebirr SuperApp Till">Telebirr SuperApp / Till (0931418513)</option>
                  <option value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (1000481928471)</option>
                </select>
              </div>

              {/* Transaction Slip Code Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Bank / Telebirr Transaction Reference ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TB-PF-928192 or CBE FT28194..."
                  value={platformFeeReference}
                  onChange={(e) => setPlatformFeeReference(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 font-mono focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Platform Fee Screenshot Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Transfer Receipt Screenshot (Recommended)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPlatformFeeScreenshot}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleScreenshotFile(file, setPlatformFeeScreenshotUrl, setUploadingPlatformFeeScreenshot);
                    }}
                    className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                  {uploadingPlatformFeeScreenshot && (
                    <span className="text-xs text-indigo-600 font-semibold animate-pulse">Uploading slip...</span>
                  )}
                </div>
                {platformFeeScreenshotUrl && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium truncate">Payment screenshot attached</span>
                    <a
                      href={platformFeeScreenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto underline text-emerald-700 font-bold shrink-0 flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPlatformFeeModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settlingPlatformFee}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white disabled:opacity-50 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{settlingPlatformFee ? 'Recording Settlement...' : 'Submit Platform Fee Settlement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
