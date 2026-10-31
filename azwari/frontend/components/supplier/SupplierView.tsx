'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../../context/AppContext';
import { walletApi } from '../../lib/api';
import { Order, Product, PaymentMethodProvider } from '../../types';
import { 
  Building2, 
  CheckCircle2, 
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
  ArrowRight
} from 'lucide-react';
import { SupplierSidebar, SupplierTab } from './SupplierSidebar';
import { SupplierProductManager } from './SupplierProductManager';
import { SupplierProfileSettings } from './SupplierProfileSettings';
import { SupplierWalletManager } from './SupplierWalletManager';

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

  // Active navigation tab (left side panel router) synchronized with URL
  const [activeTab, setActiveTabState] = useState<SupplierTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as SupplierTab;
      const validTabs: SupplierTab[] = ['overview', 'products', 'orders', 'wallet', 'accounts', 'settings'];
      if (validTabs.includes(tabParam)) return tabParam;
      if (params.get('deposit') === 'return' || params.get('tx_ref') || params.get('trx_ref')) {
        return 'wallet';
      }
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
      } else if (params.get('deposit') === 'return' || params.get('tx_ref') || params.get('trx_ref')) {
        setActiveTabState('wallet');
      }
    };
    window.addEventListener('popstate', handleTabPop);
    window.addEventListener('portal-tab-change', handleTabPop);

    // Initial check for deposit return parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('deposit') === 'return' || params.get('tx_ref') || params.get('trx_ref')) {
      setActiveTabState('wallet');
    }

    return () => {
      window.removeEventListener('popstate', handleTabPop);
      window.removeEventListener('portal-tab-change', handleTabPop);
    };
  }, []);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openAddProductFromGlobal, setOpenAddProductFromGlobal] = useState(false);

  // Orders Tab Filter State
  const [orderFilter, setOrderFilter] = useState<'all' | 'awaiting_payment' | 'review' | 'fulfillment' | 'delivered'>('all');
  
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

  // Live wallet details so dashboard and sidebar reflect real Chapa deposits
  const { data: walletData } = useQuery({
    queryKey: ['supplierWallet', currentSupplier.id],
    queryFn: () => walletApi.getDetails({ businessId: currentSupplier.id }),
    refetchInterval: 10000,
  });

  const liveWalletBalance = walletData?.wallet?.balances?.availableEtb ?? currentSupplier.commissionReserveBalance ?? 0;

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

  // Filtered orders
  const filteredOrders = supplierOrders.filter((o) => {
    if (orderFilter === 'awaiting_payment') return o.orderStatus === 'awaiting_payment';
    if (orderFilter === 'review') return o.orderStatus === 'payment_review';
    if (orderFilter === 'fulfillment')
      return ['payment_verified', 'scheduled', 'out_for_delivery'].includes(o.orderStatus);
    if (orderFilter === 'delivered') return ['delivered', 'completed'].includes(o.orderStatus);
    return true;
  });

  const ordersNeedingVerification = supplierOrders.filter((o) => o.orderStatus === 'payment_review');

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
          walletBalance={liveWalletBalance}
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
                      Merchant Hub
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
                  <span className="text-xs text-slate-500 block mb-1">Total Products</span>
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
                    <span className="text-xs text-slate-500 block">Total Money Received</span>
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
                  <span className="text-xs text-slate-500 block mb-1">Needs Verification</span>
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
                  onClick={() => setActiveTab('wallet')}
                  className="glass-card-hover p-5 rounded-3xl border border-emerald-500/30 cursor-pointer bg-gradient-to-br from-white via-white to-emerald-50/40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 block">Collateral Wallet</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Chapa</span>
                  </div>
                  <div className="font-mono-numbers font-bold text-xl text-slate-900">
                    ETB {Number(liveWalletBalance || 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                    Top-Up via Chapa →
                  </span>
                </div>
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
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">No receipt yet</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="font-semibold text-slate-800 block text-xs">
                                    {order.orderStatus.replace('_', ' ').toUpperCase()}
                                  </span>
                                  {order.delivery.assignedDriverName && (
                                    <span className="text-[10px] text-slate-500 block">
                                      Driver: {order.delivery.assignedDriverName}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
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
                                      <button
                                        onClick={() => markOrderDelivered(order.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs shadow-xs"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Mark Delivered</span>
                                      </button>
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

          {/* TAB 4: COLLATERAL WALLET & CHAPA DEPOSITS */}
          {activeTab === 'wallet' && (
            <SupplierWalletManager currentSupplier={currentSupplier} products={products} />
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
              walletBalance={liveWalletBalance}
              onNavigateToWallet={() => setActiveTab('wallet')}
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
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-lg rounded-3xl shadow-2xl border border-white/90 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/60 backdrop-blur-md">
              <h3 className="text-sm font-bold text-slate-900">
                Verify Customer Payment Evidence
              </h3>
              <button
                onClick={() => setVerifyingOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
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
                <div className="p-4 glass-card-subtle border border-slate-200/80 rounded-2xl space-y-2">
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {!showRejectInput ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50"
                    >
                      Reject Evidence
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmPayment(verifyingOrder.id)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      Verify & Confirm Stock
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
    </div>
  );
};
