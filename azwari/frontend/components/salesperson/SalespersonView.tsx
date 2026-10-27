'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CreateOrderModal } from './CreateOrderModal';
import { SalespersonSidebar, SalespersonTab } from './SalespersonSidebar';
import { ProductImage } from '../common/ProductImage';
import { ProductDetailsModal } from '../common/ProductDetailsModal';
import { Product } from '../../types';
import { SalespersonPayoutManager } from './SalespersonPayoutManager';
import { 
  Plus, 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Search, 
  Share2, 
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  Check,
  PackageCheck,
  Coins,
  Menu,
  Lock,
  ArrowRight,
  Eye,
  Info
} from 'lucide-react';

export const SalespersonView: React.FC = () => {
  const { 
    currentUser,
    selectedSalespersonId, 
    setSelectedSalespersonId, 
    salesPartners, 
    orders, 
    products, 
    commissionLedger, 
    settlementBatches,
    enrollSalesperson,
    setActiveRole, 
    setSelectedCustomerToken,
    setCurrentView,
    createDispute
  } = useApp();

  // Active navigation tab synchronized with URL query ?tab=
  const [activeTab, setActiveTabState] = useState<SalespersonTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as SalespersonTab;
      const validTabs: SalespersonTab[] = ['overview', 'orders', 'offers', 'ledger', 'payouts', 'disputes'];
      if (validTabs.includes(tabParam)) return tabParam;
    }
    return 'overview';
  });

  const setActiveTab = (tab: SalespersonTab) => {
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
      const tabParam = params.get('tab') as SalespersonTab;
      if (tabParam) setActiveTabState(tabParam);
    };
    window.addEventListener('popstate', handleTabPop);
    return () => window.removeEventListener('popstate', handleTabPop);
  }, []);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOfferForModal, setSelectedOfferForModal] = useState<string | undefined>(undefined);
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Dispute creation state
  const [disputeOrderId, setDisputeOrderId] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeCategory, setDisputeCategory] = useState<'commission_discrepancy' | 'delayed_delivery' | 'supplier_unresponsive'>('commission_discrepancy');
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  const currentAgent = salesPartners.find(
    (sp) => sp.id === (currentUser?.salespersonId || selectedSalespersonId)
  ) || salesPartners[0] || {
    id: currentUser?.salespersonId || 'sp_default',
    fullName: currentUser?.name || 'Independent Sales Agent',
    phone: currentUser?.phone || '',
    idNumber: 'ET-VERIFIED',
    verificationStatus: 'verified' as const,
    city: 'Addis Ababa',
    subcity: currentUser?.subcity || 'Bole',
    payoutDestination: {
      provider: 'Telebirr' as const,
      accountNumber: currentUser?.phone || '0911000000',
      accountHolderName: currentUser?.name || 'Sales Agent',
    },
    totalAttributedSales: 0,
    pendingCommissions: 0,
    eligibleCommissions: 0,
    paidCommissions: 0,
    enrolledProductIds: [],
    referralCode: 'ARIF-AGENT',
    joinedAt: new Date().toISOString(),
  };

  const agentOrders = useMemo(() => {
    return orders.filter((o) => o.salespersonId === currentAgent.id);
  }, [orders, currentAgent.id]);

  const agentLedger = useMemo(() => {
    return commissionLedger.filter((l) => l.salespersonId === currentAgent.id);
  }, [commissionLedger, currentAgent.id]);

  const agentBatches = useMemo(() => {
    return settlementBatches.filter((b) => b.recipientId === currentAgent.id);
  }, [settlementBatches, currentAgent.id]);

  // CRITICAL: Filter out paused, draft, and inactive products so sales agents only see live active offers
  const activeProducts = useMemo(() => {
    return products.filter((p) => {
      // If product status is draft, archived, or out_of_stock, or isActive is false, hide from agents
      if ((p as any).isActive === false) return false;
      if (p.status && p.status !== 'active') return false;
      return true;
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeProducts, searchQuery]);

  const handleCopyLink = (order: typeof orders[0]) => {
    const link = `${window.location.origin}/order/${order.orderNumber}?token=${order.publicAccessToken}`;
    navigator.clipboard.writeText(link);
    setCopiedOrderId(order.id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleOpenBuyerPage = (order: typeof orders[0]) => {
    setSelectedCustomerToken(order.publicAccessToken);
    setCurrentView('track_order');
  };

  const handleRaiseDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeOrderId || !disputeReason) return;
    createDispute(disputeOrderId, disputeCategory, disputeReason, 'salesperson', currentAgent.fullName);
    setDisputeSuccess(true);
    setDisputeReason('');
    setTimeout(() => setDisputeSuccess(false), 3000);
  };

  const statusColors: Record<string, string> = {
    awaiting_payment: 'text-amber-800 bg-amber-50 border-amber-200',
    payment_review: 'text-slate-800 bg-slate-100 border-slate-300',
    payment_verified: 'text-slate-900 bg-slate-100 border-slate-300 font-semibold',
    scheduled: 'text-slate-800 bg-slate-50 border-slate-200',
    out_for_delivery: 'text-amber-900 bg-amber-50 border-amber-300',
    delivered: 'text-slate-900 bg-slate-100 border-slate-300 font-semibold',
    completed: 'text-slate-900 bg-slate-100 border-slate-300 font-bold',
    cancelled: 'text-rose-800 bg-rose-50 border-rose-200',
    disputed: 'text-rose-900 bg-rose-100 border-rose-300',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Mobile Top Header Bar with Hamburger Button */}
      <div className="lg:hidden flex items-center justify-between mb-4 glass-card p-3 rounded-2xl border border-white/90">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          <Menu className="w-4 h-4 text-amber-400" />
          <span>Agent Menu</span>
        </button>

        <div className="flex items-center gap-2 text-right">
          <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
            {currentAgent.fullName}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Main Flex Layout: Left Side Panel + Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side Panel Navigation */}
        <SalespersonSidebar
          currentAgent={currentAgent}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          ordersCount={agentOrders.length}
          activeOffersCount={activeProducts.length}
          ledgerCount={agentLedger.length}
          pendingCommissions={currentAgent.pendingCommissions}
          eligibleCommissions={currentAgent.eligibleCommissions}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
          onCreateOrderClick={() => {
            setSelectedOfferForModal(undefined);
            setShowCreateModal(true);
          }}
        />

        {/* Right Content Area */}
        <div className="flex-1 w-full space-y-6 min-w-0">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Salesperson Hero Header */}
              <div className="glass-card rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/90 relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    {currentAgent.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-slate-900">{currentAgent.fullName}</h1>
                      <span className="text-xs text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md font-semibold border border-slate-200">
                        Verified Sales Agent
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Phone: <span className="font-mono text-slate-700">{currentAgent.phone}</span> · Telegram: <span className="text-slate-800 font-semibold">{currentAgent.telegramUsername || '@agent'}</span> · Base: {currentAgent.subcity}, Addis Ababa
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedOfferForModal(undefined);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Create Order for Buyer</span>
                  </button>
                </div>
              </div>

              {/* Financial KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <span className="text-xs text-slate-500 block mb-1">Attributed Sales</span>
                  <div className="font-mono-numbers font-bold text-xl text-slate-900">
                    ETB {currentAgent.totalAttributedSales.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {agentOrders.length} total orders generated
                  </span>
                </div>

                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <span className="text-xs text-slate-500 block mb-1">Pending Commissions</span>
                  <div className="font-mono-numbers font-bold text-xl text-amber-700">
                    ETB {currentAgent.pendingCommissions.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Awaiting customer payment/delivery
                  </span>
                </div>

                <div 
                  onClick={() => setActiveTab('payouts')}
                  className="glass-card-hover p-5 rounded-3xl border border-emerald-500/30 cursor-pointer bg-gradient-to-br from-white via-white to-emerald-50/40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 block">Eligible for Payout</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Chapa</span>
                  </div>
                  <div className="font-mono-numbers font-bold text-xl text-emerald-800">
                    ETB {currentAgent.eligibleCommissions.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                    Cash out now →
                  </span>
                </div>

                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <span className="text-xs text-slate-500 block mb-1">Total Paid Out</span>
                  <div className="font-mono-numbers font-bold text-xl text-slate-600">
                    ETB {currentAgent.paidCommissions.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Settled to {currentAgent.payoutDestination.provider}
                  </span>
                </div>
              </div>

              {/* Recent Orders Preview Card */}
              <div className="glass-card rounded-3xl border border-white/90 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">Recent Customer Orders</h2>
                    <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> Read-Only Attributed
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-slate-800 hover:text-slate-900 flex items-center gap-1"
                  >
                    View all ({agentOrders.length}) <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {agentOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No orders created yet. Click "Create Order for Buyer" to generate your first order.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4">Order Ref</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-4 text-right">Commission</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agentOrders.slice(0, 3).map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-medium text-slate-900">
                              {order.orderNumber}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {order.buyerName}
                            </td>
                            <td className="py-3 px-4 text-slate-700 truncate max-w-[150px]">
                              {order.items[0]?.productName}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                              ETB {order.totalAmount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              ETB {order.agreedCommissionAmount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium border capitalize ${
                                  statusColors[order.orderStatus] || 'text-slate-600 bg-slate-50 border-slate-200'
                                }`}
                              >
                                {order.orderStatus.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5">
                              <button
                                onClick={() => handleCopyLink(order)}
                                title="Copy customer SMS link"
                                className="p-1 rounded-md hover:bg-slate-200/70 text-slate-600 transition-colors inline-flex items-center gap-1 text-[11px]"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedOrderId === order.id ? 'Copied' : 'Link'}</span>
                              </button>
                              <button
                                onClick={() => handleOpenBuyerPage(order)}
                                title="Open customer tracker"
                                className="p-1 rounded-md hover:bg-slate-100 text-slate-900 font-medium transition-colors inline-flex items-center gap-1 text-[11px]"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Top Active Products to Sell */}
              <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Available Products Ready to Sell</h2>
                    <p className="text-xs text-slate-500">Live active offers verified by Addis Ababa suppliers</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('offers')}
                    className="text-xs font-semibold text-slate-800 hover:text-slate-900 flex items-center gap-1"
                  >
                    Explore all ({activeProducts.length}) <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activeProducts.slice(0, 3).map((prod) => (
                    <div key={prod.id} className="rounded-2xl glass-card-subtle border border-slate-200/90 overflow-hidden flex flex-col justify-between group">
                      {/* Visual Product Image Header */}
                      <div className="relative">
                        <ProductImage
                          src={prod.imageUrl}
                          alt={prod.name}
                          category={prod.category}
                          aspectRatio="wide"
                          className="w-full h-36 cursor-pointer"
                          showCategoryBadge={true}
                          zoomOnHover={true}
                        />
                        <button
                          onClick={() => setInspectedProduct(prod)}
                          className="absolute bottom-2 right-2 bg-white/95 hover:bg-white text-slate-900 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm border border-slate-200/80 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-slate-700" />
                          <span>View Details</span>
                        </button>
                      </div>

                      <div className="p-4 space-y-2.5">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                            <span className="truncate max-w-[120px]">{prod.supplierName}</span>
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
                          </div>
                          <h3 
                            onClick={() => setInspectedProduct(prod)}
                            className="text-xs font-bold text-slate-900 line-clamp-1 cursor-pointer hover:text-slate-700"
                          >
                            {prod.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{prod.description}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Retail:</span>
                            <span className="font-mono font-bold text-slate-900">ETB {prod.unitPrice.toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-600 font-semibold block">Commission:</span>
                            <span className="font-mono font-bold text-emerald-800">
                              {prod.commissionTerms?.type === 'fixed_per_unit'
                                ? `ETB ${prod.commissionTerms.rateOrAmount}`
                                : `${prod.commissionTerms?.rateOrAmount || 12}%`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setInspectedProduct(prod)}
                            className="w-1/3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOfferForModal(prod.id);
                              setShowCreateModal(true);
                            }}
                            className="w-2/3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                          >
                            Sell to Buyer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY ORDERS (STRICTLY READ-ONLY) */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Security & Audit Notice */}
              <div className="p-4 glass-card-subtle rounded-2xl border border-slate-200/80 flex items-start gap-3">
                <Lock className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong>Permanent Attribution Record:</strong> In accordance with Ethiopian commercial regulations and platform trust protocols, orders placed by sales agents are permanently registered and cannot be edited or deleted once generated. Commission terms are cryptographically snapshotted to protect your earnings.
                </div>
              </div>

              <div className="glass-card rounded-3xl border border-white/90 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Orders Created on Behalf of Buyers
                    </h2>
                    <span className="text-xs text-slate-500">
                      Showing {agentOrders.length} total orders attributed to your referral ID
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOfferForModal(undefined);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>New Order</span>
                  </button>
                </div>

                {agentOrders.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    No orders created yet. Click "Create Order for Buyer" to place your first customer order.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-4">Order Ref</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Product & Supplier</th>
                          <th className="py-3 px-4 text-right">Order Total</th>
                          <th className="py-3 px-4 text-right">Your Commission</th>
                          <th className="py-3 px-4">Order Status</th>
                          <th className="py-3 px-4 text-right">Tracking & View</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agentOrders.map((order) => {
                          return (
                            <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                                {order.orderNumber}
                                <span className="block text-[11px] text-slate-400 font-sans">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-800">{order.buyerName}</div>
                                <div className="font-mono text-slate-500 text-[11px]">{order.buyerPhone}</div>
                                <div className="text-slate-400 text-[10px]">{order.delivery.subcity}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-medium text-slate-800 truncate max-w-xs">
                                  {order.items[0]?.productName}
                                </div>
                                <div className="text-[11px] text-slate-500">{order.supplierName}</div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                                ETB {order.totalAmount.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="font-mono font-bold text-slate-900">
                                  ETB {order.agreedCommissionAmount.toLocaleString()}
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  {order.orderStatus === 'delivered' || order.orderStatus === 'completed'
                                    ? 'Eligible'
                                    : 'Estimated'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium border capitalize ${
                                    statusColors[order.orderStatus] || 'text-slate-600 bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  {order.orderStatus.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button
                                  onClick={() => handleCopyLink(order)}
                                  title="Copy customer SMS link"
                                  className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-600 transition-colors inline-flex items-center gap-1"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">
                                    {copiedOrderId === order.id ? 'Copied' : 'Link'}
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleOpenBuyerPage(order)}
                                  title="Open customer order tracker page"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-900 font-medium transition-colors inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">View</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AVAILABLE OFFERS CATALOG (ACTIVE PRODUCTS ONLY) */}
          {activeTab === 'offers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search active products or suppliers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 bg-white/90 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>
                <div className="text-xs text-slate-500">
                  Showing {filteredProducts.length} active offers (paused products automatically hidden)
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs glass-card rounded-3xl border border-white/90">
                  No active products match your search. Paused or out of stock items are not displayed.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredProducts.map((prod) => {
                    const isEnrolled = currentAgent.enrolledProductIds.includes(prod.id);

                    return (
                      <div
                        key={prod.id}
                        className="glass-card-hover rounded-3xl overflow-hidden flex flex-col justify-between group"
                      >
                        {/* Visual Image Header */}
                        <div className="relative">
                          <ProductImage
                            src={prod.imageUrl}
                            alt={prod.name}
                            category={prod.category}
                            aspectRatio="wide"
                            className="w-full h-44 cursor-pointer"
                            showCategoryBadge={true}
                            zoomOnHover={true}
                          />
                          <button
                            onClick={() => setInspectedProduct(prod)}
                            className="absolute bottom-2.5 right-2.5 bg-white/95 hover:bg-white text-slate-900 text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-md border border-slate-200/80 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-700" />
                            <span>Visual Details</span>
                          </button>
                        </div>

                        <div className="p-5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              {prod.category}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Active Offer
                            </span>
                          </div>

                          <h3 
                            onClick={() => setInspectedProduct(prod)}
                            className="text-sm font-bold text-slate-900 leading-snug cursor-pointer hover:text-slate-700 transition-colors"
                          >
                            {prod.name}
                          </h3>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {prod.description}
                          </p>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] text-slate-400 block">Retail Price:</span>
                              <span className="font-mono-numbers font-bold text-sm text-slate-900">
                                ETB {prod.unitPrice.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-600 font-semibold block">
                                Agent Commission:
                              </span>
                              <span className="font-mono-numbers font-bold text-sm text-emerald-800">
                                {prod.commissionTerms.type === 'fixed_per_unit'
                                  ? `ETB ${prod.commissionTerms.rateOrAmount.toLocaleString()}/unit`
                                  : `${prod.commissionTerms.rateOrAmount}% (~ETB ${Math.round(
                                      (prod.unitPrice * prod.commissionTerms.rateOrAmount) / 100
                                    ).toLocaleString()})`}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50/80 rounded-2xl text-[11px] text-slate-500 space-y-1 border border-slate-200/80">
                            <div>
                              Supplier: <strong className="text-slate-700">{prod.supplierName}</strong>
                            </div>
                            <div>
                              Delivery: {prod.deliveryAreas.slice(0, 4).join(', ')}... (+ETB {prod.standardDeliveryFee})
                            </div>
                            <div>
                              Settlement Window: {prod.commissionTerms.settlementDeadlineHours}h post delivery
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50/50 border-t border-slate-200/70 flex items-center gap-2">
                          <button
                            onClick={() => setInspectedProduct(prod)}
                            className="w-1/3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-2xs"
                          >
                            Inspect
                          </button>

                          <button
                            onClick={() => {
                              setSelectedOfferForModal(prod.id);
                              setShowCreateModal(true);
                            }}
                            className="w-2/3 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs"
                          >
                            Sell to Buyer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMMISSION LEDGER */}
          {activeTab === 'ledger' && (
            <div className="glass-card rounded-3xl border border-white/90 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Immutable Commission Ledger
                  </h2>
                  <p className="text-xs text-slate-500">
                    Audited records with strict separation between estimated, eligible, and paid commissions.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Eligible Payout:</span>
                  <span className="font-mono-numbers font-bold text-slate-900 text-sm">
                    ETB {currentAgent.eligibleCommissions.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Calculation Basis</th>
                      <th className="py-3 px-4 text-right">Commission Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Payout Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agentLedger.map((entry) => {
                      const statusBadges: Record<string, string> = {
                        estimated: 'text-slate-600 bg-slate-100',
                        pending: 'text-amber-800 bg-amber-50',
                        eligible: 'text-slate-900 bg-slate-100 font-semibold border border-slate-300',
                        paid: 'text-slate-800 bg-slate-200/80 font-semibold',
                        disputed: 'text-rose-800 bg-rose-50',
                        reversed: 'text-slate-400 bg-slate-100 line-through',
                      };

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            {entry.orderNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{entry.supplierName}</td>
                          <td className="py-3 px-4 text-slate-600">{entry.calculationNote}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ETB {entry.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] capitalize ${
                                statusBadges[entry.status] || 'bg-slate-100'
                              }`}
                            >
                              {entry.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {entry.payoutReference || (entry.status === 'eligible' ? 'Ready for next batch' : '—')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: PAYOUTS & BANKING (CHAPA DIRECT TRANSFER) */}
          {activeTab === 'payouts' && (
            <SalespersonPayoutManager currentAgent={currentAgent} />
          )}

          {/* TAB 6: DISPUTES & SUPPORT */}
          {activeTab === 'disputes' && (
            <div className="max-w-2xl glass-card rounded-3xl border border-white/90 p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Submit a Dispute</h2>
                <p className="text-xs text-slate-500">
                  If a supplier has rejected a legitimate order, delayed delivery, or failed to honor commission obligations, submit an audited complaint for platform administrative arbitration.
                </p>
              </div>

              {disputeSuccess && (
                <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 text-xs font-medium">
                  Dispute ticket submitted successfully. Platform compliance will review within 24 hours.
                </div>
              )}

              <form onSubmit={handleRaiseDispute} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Select Order *
                  </label>
                  <select
                    required
                    value={disputeOrderId}
                    onChange={(e) => setDisputeOrderId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900"
                  >
                    <option value="">Select an order to dispute...</option>
                    {agentOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} — {o.buyerName} ({o.items[0]?.productName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Dispute Category *
                  </label>
                  <select
                    value={disputeCategory}
                    onChange={(e) => setDisputeCategory(e.target.value as any)}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900"
                  >
                    <option value="commission_discrepancy">Commission Discrepancy or Unpaid Settlement</option>
                    <option value="delayed_delivery">Delayed or Failed Delivery by Supplier</option>
                    <option value="supplier_unresponsive">Supplier Unresponsive to Buyer or Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Detailed Explanation & Evidence *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Explain what occurred, communications with the supplier, and why this requires platform intervention..."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs"
                >
                  Submit Dispute to Platform Admin
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal
          initialProductId={selectedOfferForModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Visual Product Details & Inspection Modal */}
      {inspectedProduct && (
        <ProductDetailsModal
          product={inspectedProduct}
          onClose={() => setInspectedProduct(null)}
          onSellProduct={(p) => {
            setSelectedOfferForModal(p.id);
            setShowCreateModal(true);
          }}
          userRole="salesperson"
        />
      )}
    </div>
  );
};
