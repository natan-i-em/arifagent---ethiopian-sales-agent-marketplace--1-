'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../context/AppContext';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { commissionsApi, analyticsApi } from '../../lib/api';
import { 
  ShieldCheck, 
  Building2, 
  AlertTriangle, 
  MessageSquareText, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Search, 
  DollarSign, 
  Activity, 
  Users, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  ShoppingBag, 
  MapPin, 
  Clock, 
  ArrowUpRight, 
  Filter, 
  CreditCard, 
  UserCheck, 
  UserX, 
  Phone, 
  Mail, 
  Send, 
  ExternalLink, 
  ChevronRight, 
  Layers, 
  Coins, 
  Award, 
  Sparkles, 
  RefreshCw,
  Flame,
  Smartphone,
  Globe,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react';

interface UnifiedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'salesperson' | 'supplier';
  subcity: string;
  status: string;
  metadata?: string;
  secondaryMeta?: string;
  createdAt: string;
}

export const AdminView: React.FC = () => {
  const { 
    businesses, 
    salesPartners,
    products,
    orders, 
    commissionLedger, 
    platformFeeLedger, 
    settlementBatches, 
    disputes, 
    smsOutbox, 
    auditLogs,
    waitlist,
    currentUser,
    inviteWaitlistEntry,
    verifyBusiness,
    resolveDispute
  } = useApp();

  // Active navigation tab synchronized with URL query ?tab=
  const [activeTab, setActiveTabState] = useState<AdminTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as AdminTab;
      const validTabs: AdminTab[] = ['analytics', 'funnels', 'users', 'verifications', 'waitlist', 'disputes', 'sms', 'audit', 'finances'];
      if (validTabs.includes(tabParam)) return tabParam;
    }
    return 'analytics';
  });

  const setActiveTab = (tab: AdminTab) => {
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
      const tabParam = params.get('tab') as AdminTab;
      const validTabs: AdminTab[] = ['analytics', 'funnels', 'users', 'verifications', 'waitlist', 'disputes', 'sms', 'audit', 'finances'];
      if (tabParam && validTabs.includes(tabParam)) setActiveTabState(tabParam);
    };
    window.addEventListener('popstate', handleTabPop);
    window.addEventListener('portal-tab-change', handleTabPop);
    return () => {
      window.removeEventListener('popstate', handleTabPop);
      window.removeEventListener('portal-tab-change', handleTabPop);
    };
  }, []);

  const queryClient = useQueryClient();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [disputeDecision, setDisputeDecision] = useState('');
  const [disputeNote, setDisputeNote] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Interactive feedback toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Fast action loading indicators
  const [verifyingBizId, setVerifyingBizId] = useState<string | null>(null);
  const [invitingWaitlistId, setInvitingWaitlistId] = useState<string | null>(null);
  const [nudgeLoadingId, setNudgeLoadingId] = useState<string | null>(null);

  // Finances & Platform Fee sub-tabs & filters
  const [feeSubTab, setFeeSubTab] = useState<'suppliers' | 'payouts'>('suppliers');
  const [supplierFeeFilter, setSupplierFeeFilter] = useState<'all' | 'outstanding' | 'paid'>('all');
  const [supplierFeeSearch, setSupplierFeeSearch] = useState('');
  const [payoutSearch, setPayoutSearch] = useState('');
  const [markingPaidBizId, setMarkingPaidBizId] = useState<string | null>(null);
  const [remindingBizId, setRemindingBizId] = useState<string | null>(null);

  // Queries for funnels and platform fees
  const { data: funnelsData, isLoading: isLoadingFunnels, refetch: refetchFunnels } = useQuery({
    queryKey: ['analytics-funnels'],
    queryFn: () => analyticsApi.getFunnels(),
    staleTime: 30000,
  });

  const { data: platformFeesData, isLoading: isLoadingFees, refetch: refetchFees } = useQuery({
    queryKey: ['platform-fees-summary'],
    queryFn: () => commissionsApi.getPlatformFeesSummary(),
    staleTime: 20000,
  });

  // Users Directory state
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'salesperson' | 'supplier' | 'admin'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Fetch users from PostgreSQL backend
  const fetchDbUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setDbUsers(data.users);
      }
    } catch (err) {
      console.warn('[Users Directory Fetch Error]', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchDbUsers();
  }, []);

  // Aggregated Unified Users
  const unifiedUsers = useMemo(() => {
    const list: UnifiedUser[] = [];
    const seenEmails = new Set<string>();

    // 1. Current / Seed Admins
    const adminEmail = currentUser?.email || 'admin@azwari.et';
    seenEmails.add(adminEmail.toLowerCase());
    list.push({
      id: currentUser?.id || 'admin_primary',
      name: currentUser?.name || 'Platform Super Admin',
      email: adminEmail,
      phone: currentUser?.phone || '+251 911 000000',
      role: 'admin',
      subcity: 'Bole Central',
      status: 'Active · Superuser',
      metadata: 'Governance clearance: Unrestricted',
      secondaryMeta: 'Addis Ababa Central Node',
      createdAt: '2026-01-01T00:00:00Z',
    });

    // 2. Add PostgreSQL users
    dbUsers.forEach((u) => {
      const emailLower = (u.email || '').toLowerCase();
      if (!emailLower || seenEmails.has(emailLower)) return;
      seenEmails.add(emailLower);

      list.push({
        id: u.id,
        name: u.fullName || u.email.split('@')[0],
        email: u.email,
        phone: u.phone || '—',
        role: (u.role as any) || 'salesperson',
        subcity: u.subcity || 'Addis Ababa',
        status: 'Active · Verified',
        metadata: `Account ID: ${u.id.substring(0, 8)}`,
        createdAt: u.createdAt || new Date().toISOString(),
      });
    });

    // 3. Add Suppliers / Businesses
    businesses.forEach((b) => {
      const emailLower = (b.contactEmail || '').toLowerCase();
      if (emailLower && !seenEmails.has(emailLower)) {
        seenEmails.add(emailLower);
        list.push({
          id: b.id,
          name: b.name,
          email: b.contactEmail,
          phone: b.phone,
          role: 'supplier',
          subcity: b.subcity,
          status: b.verificationStatus === 'verified' ? 'Active · Verified KYC' : 'Pending KYC Audit',
          metadata: `TIN: ${b.tinNumber} · Trade: ${b.tradeName}`,
          secondaryMeta: `Reserve Balance: ETB ${Number(b.commissionReserveBalance || 0).toLocaleString()}`,
          createdAt: b.createdAt || new Date().toISOString(),
        });
      }
    });

    // 4. Add Sales Partners
    salesPartners.forEach((sp) => {
      const spEmail = (sp as any).email || `${sp.phone}@sales.azwari.et`;
      const emailLower = spEmail.toLowerCase();
      if (!seenEmails.has(emailLower)) {
        seenEmails.add(emailLower);
        const payoutDesc = sp.payoutDestination
          ? `${sp.payoutDestination.provider} (${sp.payoutDestination.accountNumber})`
          : 'Telebirr';
        list.push({
          id: sp.id,
          name: sp.fullName,
          email: (sp as any).email || '—',
          phone: sp.phone,
          role: 'salesperson',
          subcity: sp.subcity,
          status: 'Active Sales Agent',
          metadata: `Referral Code: ${sp.referralCode} · ${payoutDesc}`,
          secondaryMeta: `Attributed GMV: ETB ${Number(sp.totalAttributedSales || 0).toLocaleString()}`,
          createdAt: sp.joinedAt || new Date().toISOString(),
        });
      }
    });

    return list;
  }, [currentUser, dbUsers, businesses, salesPartners]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return unifiedUsers.filter((u) => {
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      const q = userSearchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.subcity.toLowerCase().includes(q) ||
        (u.metadata && u.metadata.toLowerCase().includes(q));
      return matchesRole && matchesSearch;
    });
  }, [unifiedUsers, userRoleFilter, userSearchQuery]);

  // Core Financial Calculations
  const totalGMV = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const totalPlatformFees = platformFeeLedger.reduce((sum, f) => sum + (Number(f.amount) || 0), 0) || Math.round(totalGMV * 0.02);
  const totalEligibleCommissions = commissionLedger
    .filter((c) => c.status === 'eligible')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const totalSettledCommissions = settlementBatches.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const pendingDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'under_review');
  const pendingVerifications = businesses.filter((b) => b.verificationStatus === 'pending');
  const waitlistPending = waitlist.filter((w) => w.status === 'waitlisted');

  // Order Funnel & Analytics Metrics (aligned with OrderStatus domain type)
  const deliveredOrders = orders.filter((o) => o.orderStatus === 'delivered' || o.orderStatus === 'completed');
  const dispatchedOrders = orders.filter((o) => o.orderStatus === 'out_for_delivery' || o.orderStatus === 'scheduled');
  const confirmedOrders = orders.filter((o) => o.orderStatus === 'confirmed' || o.orderStatus === 'preparing' || o.orderStatus === 'payment_verified');
  const inPaymentOrders = orders.filter(
    (o) => o.orderStatus === 'awaiting_payment' || o.orderStatus === 'payment_review' || o.orderStatus === 'draft'
  );
  const disputedOrders = orders.filter((o) => o.orderStatus === 'disputed');
  const cancelledOrders = orders.filter((o) => o.orderStatus === 'cancelled');

  const avgOrderValue = orders.length > 0 ? Math.round(totalGMV / orders.length) : 0;
  const deliveryFulfillmentRate =
    orders.length > 0 ? Math.round((deliveredOrders.length / orders.length) * 100) : 0;

  // Subcities Distribution
  const subcityStats = useMemo(() => {
    const map: Record<string, { count: number; gmv: number }> = {};
    orders.forEach((o) => {
      const sc = o.delivery?.subcity || 'Addis Ababa';
      if (!map[sc]) map[sc] = { count: 0, gmv: 0 };
      map[sc].count += 1;
      map[sc].gmv += Number(o.totalAmount) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].gmv - a[1].gmv);
  }, [orders]);

  // Payment Rails Distribution
  const paymentRailsStats = useMemo(() => {
    const map: Record<string, { count: number; gmv: number }> = {};
    orders.forEach((o) => {
      const prov = String(o.selectedPaymentAccount?.provider || 'Telebirr');
      const label =
        prov.includes('Telebirr')
          ? 'Telebirr SuperApp'
          : prov.includes('CBE') || prov.includes('Commercial Bank')
          ? 'CBE Birr / Direct Transfer'
          : prov.includes('Awash')
          ? 'Awash Bank'
          : prov;
      if (!map[label]) map[label] = { count: 0, gmv: 0 };
      map[label].count += 1;
      map[label].gmv += Number(o.totalAmount) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [orders]);

  // Top Sales Agents
  const topSalesAgents = useMemo(() => {
    return [...salesPartners]
      .sort((a, b) => Number(b.totalAttributedSales || 0) - Number(a.totalAttributedSales || 0))
      .slice(0, 5);
  }, [salesPartners]);

  // Top Suppliers
  const topSuppliers = useMemo(() => {
    return [...businesses]
      .map((b) => {
        const bizOrders = orders.filter((o) => o.supplierId === b.id);
        const bizProducts = products.filter((p) => p.supplierId === b.id);
        const bizGmv = bizOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        return {
          ...b,
          orderCount: bizOrders.length,
          productCount: bizProducts.length,
          gmv: bizGmv,
        };
      })
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 5);
  }, [businesses, orders, products]);

  const handleResolveDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisputeId || !disputeDecision) return;
    resolveDispute(selectedDisputeId, disputeDecision, disputeNote);
    setSelectedDisputeId(null);
    setDisputeDecision('');
    setDisputeNote('');
  };

  const filteredAuditLogs = auditLogs.filter(
    (log) =>
      log.description.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.actorName.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Super Admin Operations Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-bold text-lg border border-white/10 shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">Platform Governance & Compliance Desk</h1>
              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-700">
                Super Admin Clearance
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Addis Ababa Central Command Node</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Platform Operational
              </span>
              <span>·</span>
              <span className="text-slate-400">SMS Gateway Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Sidebar + Working Canvas */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side Navigation Bar */}
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingVerificationsCount={pendingVerifications.length}
          pendingDisputesCount={pendingDisputes.length}
          waitlistCount={waitlistPending.length}
          usersCount={unifiedUsers.length}
          ordersCount={orders.length}
          totalGMV={totalGMV}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
        />

        {/* Working Canvas for Active Operations Tab */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* TAB 1: DETAILED ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Executive KPI Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Cumulative GMV</span>
                    <TrendingUp className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    ETB {totalGMV.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {orders.length} total orders recorded
                  </span>
                </div>

                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Platform Fee (20% Cut)</span>
                    <Coins className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    ETB {(platformFeesData?.totals?.totalPlatformFeesIncurred || totalPlatformFees).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    20% retained from agent commissions
                  </span>
                </div>

                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Avg Order Value (AOV)</span>
                    <ShoppingBag className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    ETB {avgOrderValue.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Across all retail categories
                  </span>
                </div>

                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Fulfillment Rate</span>
                    <CheckCircle2 className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    {deliveryFulfillmentRate}%
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {deliveredOrders.length} delivered / {orders.length} orders
                  </span>
                </div>
              </div>

              {/* Order Status & Velocity Funnel */}
              <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-slate-700" />
                      Order Lifecycle Velocity & Status Breakdown
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Distribution of marketplace transactions across payment, dispatch, delivery, and arbitration.
                    </p>
                  </div>
                  <div className="text-xs font-mono text-slate-600 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                    {orders.length} Active Platform Transactions
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 font-medium block">Delivered</span>
                    <div className="font-mono-numbers text-lg font-bold text-emerald-700 mt-0.5">
                      {deliveredOrders.length}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {orders.length ? Math.round((deliveredOrders.length / orders.length) * 100) : 0}% of volume
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 font-medium block">Dispatched</span>
                    <div className="font-mono-numbers text-lg font-bold text-blue-700 mt-0.5">
                      {dispatchedOrders.length}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">En route with driver</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 font-medium block">Confirmed</span>
                    <div className="font-mono-numbers text-lg font-bold text-indigo-700 mt-0.5">
                      {confirmedOrders.length}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Payment verified</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 font-medium block">Pending Payment</span>
                    <div className="font-mono-numbers text-lg font-bold text-amber-700 mt-0.5">
                      {inPaymentOrders.length}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Awaiting Telebirr/CBE</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 font-medium block">Disputed</span>
                    <div className="font-mono-numbers text-lg font-bold text-rose-700 mt-0.5">
                      {disputedOrders.length}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Arbitration required</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 font-medium block">Cancelled</span>
                    <div className="font-mono-numbers text-lg font-bold text-slate-700 mt-0.5">
                      {cancelledOrders.length}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Expired or voided</span>
                  </div>
                </div>
              </div>

              {/* Two-Column Analytics: Regional Addis Subcities & Payment Channels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Addis Ababa Subcity Distribution */}
                <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-700" />
                        Addis Ababa Subcity Density
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Demand and delivery volume by municipal subcity.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {subcityStats.length === 0 ? (
                      <div className="text-xs text-slate-400 py-6 text-center">
                        No geographic order logs recorded yet.
                      </div>
                    ) : (
                      subcityStats.map(([subcity, stat]) => {
                        const pct = totalGMV > 0 ? Math.round((stat.gmv / totalGMV) * 100) : 0;
                        return (
                          <div key={subcity} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">{subcity} Subcity</span>
                              <div className="text-right font-mono">
                                <span className="font-bold text-slate-900">
                                  ETB {stat.gmv.toLocaleString()}
                                </span>
                                <span className="text-slate-400 text-[11px] ml-2">
                                  ({stat.count} orders · {pct}%)
                                </span>
                              </div>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-700 rounded-full transition-all"
                                style={{ width: `${Math.max(5, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Ethiopian Payment Rails Mix */}
                <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-700" />
                      Payment Rails & Gateway Mix
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Breakdown of buyer payment authorizations in Addis Ababa.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {paymentRailsStats.length === 0 ? (
                      <div className="text-xs text-slate-400 py-6 text-center">
                        No payment transactions recorded yet.
                      </div>
                    ) : (
                      paymentRailsStats.map(([rail, stat]) => {
                        const pct = orders.length > 0 ? Math.round((stat.count / orders.length) * 100) : 0;
                        return (
                          <div key={rail} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-slate-900">{rail}</div>
                              <div className="text-[11px] text-slate-500">
                                {stat.count} successful transactions ({pct}%)
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono-numbers font-bold text-sm text-slate-900">
                                ETB {stat.gmv.toLocaleString()}
                              </div>
                              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                Verified Rail
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Leaderboards: Top Agents & Top Suppliers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Agents Leaderboard */}
                <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        Top Performing Sales Agents
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Leading sales ambassadors ranked by confirmed GMV.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {topSalesAgents.map((agent, idx) => (
                      <div key={agent.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                            idx === 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{agent.fullName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Code: {agent.referralCode} · {agent.subcity}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-xs font-bold text-slate-900">
                            ETB {Number(agent.totalAttributedSales || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            Eligible: ETB {Number(agent.eligibleCommissions || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Suppliers Leaderboard */}
                <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-700" />
                        Top Suppliers by Commercial Scale
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Merchants with highest order velocity and active catalog.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {topSuppliers.map((biz, idx) => (
                      <div key={biz.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                            idx === 0 ? 'bg-purple-100 text-purple-900 border border-purple-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{biz.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {biz.productCount} products · {biz.subcity} Subcity
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-xs font-bold text-slate-900">
                            ETB {biz.gmv.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {biz.orderCount} orders fulfilled
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fast-Moving Products Leaderboard */}
              <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                      Fast-Moving Ethiopian Products (Sales Velocity & Inventory Runway)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ranked by units sold, daily turnover velocity, and estimated days of stock remaining.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      {funnelsData?.productVelocity?.fastMovingProducts?.length || 0} Ranked Items
                    </span>
                    <button
                      onClick={() => setActiveTab('funnels')}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1 hover:underline ml-1"
                    >
                      <span>Deep Funnels</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-3">Rank</th>
                        <th className="py-3 px-3">Product Name</th>
                        <th className="py-3 px-3">Merchant / Supplier</th>
                        <th className="py-3 px-3 text-right">Units Sold</th>
                        <th className="py-3 px-3 text-right">Daily Velocity</th>
                        <th className="py-3 px-3 text-center">Velocity Tier</th>
                        <th className="py-3 px-3 text-right">Stock & Runway</th>
                        <th className="py-3 px-3 text-right">Gross GMV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!funnelsData?.productVelocity?.fastMovingProducts || funnelsData.productVelocity.fastMovingProducts.length === 0) ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                            No sales velocity records logged yet. When agents confirm customer orders, velocity analytics will populate here.
                          </td>
                        </tr>
                      ) : (
                        funnelsData.productVelocity.fastMovingProducts.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] ${
                                idx === 0 ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300' :
                                idx === 1 ? 'bg-slate-200 text-slate-800 font-bold' :
                                idx === 2 ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                'bg-slate-50 text-slate-600'
                              }`}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">SKU: {p.sku || p.id.substring(0, 8)} · {p.category}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-slate-800 font-medium">{p.supplierName}</div>
                              <div className="text-[10px] text-slate-400">ETB {Number(p.unitPrice).toLocaleString()} / unit</div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                              {p.totalUnitsSold} units
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                              {p.dailyVelocity} / day
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                p.velocityTier === 'HIGH'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : p.velocityTier === 'MODERATE'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {p.velocityTier === 'HIGH' ? '🔥 High Velocity' : p.velocityTier === 'MODERATE' ? '⚡ Moderate' : '📦 Steady'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              <div className="text-slate-900 font-semibold">{p.currentStock} in stock</div>
                              <div className={`text-[10px] font-semibold ${
                                p.isOutOfStock ? 'text-rose-600' : p.isStockLow ? 'text-amber-600' : 'text-slate-500'
                              }`}>
                                {p.isOutOfStock
                                  ? 'Out of Stock'
                                  : p.daysOfSupply !== null
                                  ? `~${p.daysOfSupply}d runway`
                                  : 'Adequate stock'}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                              ETB {Number(p.totalRevenue).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: USER JOURNEY & PERFORMANCE FUNNELS */}
          {activeTab === 'funnels' && (
            <div className="space-y-6">
              {/* Funnels Header */}
              <div className="glass-card rounded-3xl border border-white/90 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    User Journey, Acquisition & Time-to-Action Analytics
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Real-time telemetry tracking visitor traffic, PWA app installs, and time-to-first-action for Ethiopian merchants and sales agents.
                  </p>
                </div>
                <button
                  onClick={() => {
                    refetchFunnels();
                    setToastMsg({ text: 'Updated analytics funnels metrics', type: 'success' });
                  }}
                  disabled={isLoadingFunnels}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shrink-0 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFunnels ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>Refresh Telemetry</span>
                </button>
              </div>

              {/* Acquisition & Funnel KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Website Visits */}
                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Website Visits</span>
                    <Globe className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    {(funnelsData?.traffic?.totalPageViews || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>+{funnelsData?.traffic?.todayViews || 0} past 24h</span>
                    <span className="font-semibold text-slate-700">{funnelsData?.traffic?.uniqueVisitors || 0} unique devices</span>
                  </div>
                </div>

                {/* 2. PWA App Downloads */}
                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">PWA App Installs</span>
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    {(funnelsData?.traffic?.appDownloads || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>+{funnelsData?.traffic?.todayDownloads || 0} past 24h</span>
                    <span className="font-semibold text-emerald-700">{funnelsData?.traffic?.downloadConversionRate || 0}% conversion</span>
                  </div>
                </div>

                {/* 3. Supplier Time-to-Action */}
                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Supplier Time-to-Product</span>
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    {funnelsData?.supplierMetrics?.medianTimeToCatalog || 'N/A'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>Median (Signup → 1st item)</span>
                    <span className="font-semibold text-purple-700">{funnelsData?.supplierMetrics?.activationRate || 0}% active</span>
                  </div>
                </div>

                {/* 4. Agent Time-to-Action */}
                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Agent Time-to-Sale</span>
                    <Zap className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    {funnelsData?.agentMetrics?.medianTimeToFirstSale || 'N/A'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>Median (Signup → 1st sale)</span>
                    <span className="font-semibold text-amber-700">{funnelsData?.agentMetrics?.activationRate || 0}% closed</span>
                  </div>
                </div>
              </div>

              {/* Two-Column Dual Funnel Stage Visualizers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Supplier Activation Funnel */}
                <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-700" />
                        Supplier Activation Funnel
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Progression from supplier registration to catalogue upload and order dispatch.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                      {funnelsData?.supplierMetrics?.activeSuppliersCount || 0} / {funnelsData?.supplierMetrics?.totalSuppliers || 0} Activated
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {(funnelsData?.supplierMetrics?.funnel || [
                      { stage: 'Registered Suppliers', count: businesses.length, percentage: 100 },
                      { stage: 'Uploaded >= 1 Product', count: businesses.filter(b => products.some(p => p.supplierId === b.id)).length, percentage: 75 },
                      { stage: 'Received Fulfillment Order', count: businesses.filter(b => orders.some(o => (o as any).businessId === b.id || o.supplierId === b.id)).length, percentage: 50 },
                    ]).map((f, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{f.stage}</span>
                          <span className="font-mono font-bold text-slate-900">{f.count} ({f.percentage}%)</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(4, Math.min(100, f.percentage))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-2 text-xs border-t border-slate-100">
                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[11px] text-slate-500 block">Fast Starters (&lt;24h)</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{funnelsData?.supplierMetrics?.fastSuppliersCount || 0}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[11px] text-slate-500 block">Catalog Stalled (0 Items)</span>
                      <span className="font-mono font-bold text-rose-700 text-sm">{funnelsData?.supplierMetrics?.stalledSuppliersCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Sales Agent Sales Funnel */}
                <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-600" />
                        Sales Agent Velocity Funnel
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Conversion rate of salespersons from registration to first sale and repeat sales.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      {funnelsData?.agentMetrics?.activeAgentsCount || 0} / {funnelsData?.agentMetrics?.totalAgents || 0} Closed Sales
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {(funnelsData?.agentMetrics?.funnel || [
                      { stage: 'Registered Sales Agents', count: salesPartners.length, percentage: 100 },
                      { stage: 'Closed 1st Verified Sale', count: salesPartners.filter(s => orders.some(o => o.salespersonId === s.id)).length, percentage: 65 },
                      { stage: 'Repeat Producers (3+ Sales)', count: salesPartners.filter(s => orders.filter(o => o.salespersonId === s.id).length >= 3).length, percentage: 35 },
                    ]).map((f, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{f.stage}</span>
                          <span className="font-mono font-bold text-slate-900">{f.count} ({f.percentage}%)</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(4, Math.min(100, f.percentage))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-2 text-xs border-t border-slate-100">
                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[11px] text-slate-500 block">Super Sellers (&lt;24h)</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{funnelsData?.agentMetrics?.fastAgentsCount || 0}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[11px] text-slate-500 block">Onboarding (0 Sales)</span>
                      <span className="font-mono font-bold text-amber-700 text-sm">{funnelsData?.agentMetrics?.stalledAgentsCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supplier Time-to-Action Ledger Table */}
              <div className="glass-card rounded-3xl border border-white/90 overflow-hidden space-y-3">
                <div className="px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-700" />
                      Supplier Time-to-Action Performance (Signup → 1st Product Upload)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Detailed duration tracking how fast merchants upload their initial inventory catalog.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    {funnelsData?.supplierMetrics?.suppliers?.length || businesses.length} Merchants Tracked
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Merchant Name</th>
                        <th className="py-3 px-4">Subcity & Contact</th>
                        <th className="py-3 px-4">Registered On</th>
                        <th className="py-3 px-4">1st Product Added</th>
                        <th className="py-3 px-4 text-right">Time-to-Upload</th>
                        <th className="py-3 px-4 text-center">Catalog Size</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!funnelsData?.supplierMetrics?.suppliers || funnelsData.supplierMetrics.suppliers.length === 0) ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                            No supplier funnels logged yet.
                          </td>
                        </tr>
                      ) : (
                        funnelsData.supplierMetrics.suppliers.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{s.name}</div>
                              {s.tradeName && <div className="text-[11px] text-slate-500">{s.tradeName}</div>}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-800">{s.subcity} Subcity</div>
                              <div className="text-[11px] font-mono text-slate-500">{s.phone}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                              {new Date(s.registeredAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4">
                              {s.hasUploadedProduct ? (
                                <div>
                                  <div className="font-medium text-slate-900 truncate max-w-xs">{s.firstProductName || 'Catalog Item'}</div>
                                  <div className="text-[10px] font-mono text-slate-400">
                                    {s.firstProductAt ? new Date(s.firstProductAt).toLocaleDateString() : 'Active'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">None yet</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold">
                              <span className={s.hasUploadedProduct ? 'text-purple-700' : 'text-slate-500'}>
                                {s.timeToActionFormatted}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                              {s.catalogSize} items
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                                s.hasUploadedProduct
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {!s.hasUploadedProduct ? (
                                <button
                                  onClick={async () => {
                                    setNudgeLoadingId(`sup_${s.id}`);
                                    try {
                                      const res = await analyticsApi.sendNudge('supplier', s.id);
                                      setToastMsg({ text: res.message || `Sent reminder SMS to ${s.name}!`, type: 'success' });
                                    } catch {
                                      setToastMsg({ text: `Failed to nudge ${s.name}`, type: 'error' });
                                    } finally {
                                      setNudgeLoadingId(null);
                                    }
                                  }}
                                  disabled={nudgeLoadingId === `sup_${s.id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-700 hover:bg-purple-800 text-white transition-colors shadow-2xs"
                                >
                                  <Send className="w-3 h-3 text-purple-200" />
                                  <span>{nudgeLoadingId === `sup_${s.id}` ? 'Sending...' : 'Nudge via SMS'}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Ready
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sales Agent Time-to-Sale Ledger Table */}
              <div className="glass-card rounded-3xl border border-white/90 overflow-hidden space-y-3">
                <div className="px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600" />
                      Sales Agent Time-to-Sale Performance (Signup → 1st Order Closed)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Elapsed duration for newly enrolled sales agents to close their first verified customer sale.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    {funnelsData?.agentMetrics?.agents?.length || salesPartners.length} Agents Tracked
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Sales Agent Name</th>
                        <th className="py-3 px-4">Referral Code & Phone</th>
                        <th className="py-3 px-4">Registered On</th>
                        <th className="py-3 px-4">1st Sale Order</th>
                        <th className="py-3 px-4 text-right">Time-to-Sale</th>
                        <th className="py-3 px-4 text-center">Orders Closed</th>
                        <th className="py-3 px-4 text-right">Attributed GMV</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!funnelsData?.agentMetrics?.agents || funnelsData.agentMetrics.agents.length === 0) ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                            No agent sales funnels logged yet.
                          </td>
                        </tr>
                      ) : (
                        funnelsData.agentMetrics.agents.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {a.fullName}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <div className="font-bold text-indigo-700">{a.referralCode}</div>
                              <div className="text-[11px] text-slate-500">{a.phone}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                              {new Date(a.registeredAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {a.hasMadeSale ? (
                                <div>
                                  <div className="font-bold text-slate-900">#{a.firstSaleOrderNumber}</div>
                                  <div className="text-[10px] text-slate-400">{a.firstSaleAt ? new Date(a.firstSaleAt).toLocaleDateString() : 'Verified'}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No sales yet</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold">
                              <span className={a.hasMadeSale ? 'text-emerald-700' : 'text-slate-500'}>
                                {a.timeToSaleFormatted}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                              {a.totalSalesCount}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                              ETB {Number(a.totalAttributedSales).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                                a.hasMadeSale
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {!a.hasMadeSale ? (
                                <button
                                  onClick={async () => {
                                    setNudgeLoadingId(`agt_${a.id}`);
                                    try {
                                      const res = await analyticsApi.sendNudge('agent', a.id);
                                      setToastMsg({ text: res.message || `Sent motivation SMS to ${a.fullName}!`, type: 'success' });
                                    } catch {
                                      setToastMsg({ text: `Failed to motivate ${a.fullName}`, type: 'error' });
                                    } finally {
                                      setNudgeLoadingId(null);
                                    }
                                  }}
                                  disabled={nudgeLoadingId === `agt_${a.id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white transition-colors shadow-2xs"
                                >
                                  <Send className="w-3 h-3 text-indigo-200" />
                                  <span>{nudgeLoadingId === `agt_${a.id}` ? 'Sending...' : 'Motivate SMS'}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Active Producer
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <div className="glass-card rounded-3xl border border-white/90 overflow-hidden space-y-4">
              {/* Directory Header with Search & Filter Tabs */}
              <div className="p-6 border-b border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-700" />
                      Platform Users Directory & Registry
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Central directory of all registered Sales Agents, Suppliers, and Operations Admins.
                    </p>
                  </div>
                  <button
                    onClick={fetchDbUsers}
                    disabled={isLoadingUsers}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-purple-700' : ''}`} />
                    <span>Refresh Registry</span>
                  </button>
                </div>

                {/* Filter and Search Controls */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
                  {/* Role Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 glass-card-subtle rounded-2xl border border-slate-200/80 overflow-x-auto">
                    <button
                      onClick={() => setUserRoleFilter('all')}
                      className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                        userRoleFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Users ({unifiedUsers.length})
                    </button>
                    <button
                      onClick={() => setUserRoleFilter('salesperson')}
                      className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                        userRoleFilter === 'salesperson'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sales Agents ({unifiedUsers.filter((u) => u.role === 'salesperson').length})
                    </button>
                    <button
                      onClick={() => setUserRoleFilter('supplier')}
                      className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                        userRoleFilter === 'supplier'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Suppliers ({unifiedUsers.filter((u) => u.role === 'supplier').length})
                    </button>
                    <button
                      onClick={() => setUserRoleFilter('admin')}
                      className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                        userRoleFilter === 'admin'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Admins ({unifiedUsers.filter((u) => u.role === 'admin').length})
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full md:w-72">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search by name, email, phone, subcity..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 pl-8 pr-3 py-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-700/20"
                    />
                  </div>
                </div>
              </div>

              {/* Users Table / Directory */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">User & Profile</th>
                      <th className="py-3 px-4">Role & Clearance</th>
                      <th className="py-3 px-4">Contact & Location</th>
                      <th className="py-3 px-4">Commercial / Referral Meta</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                          No users found matching the selected role or search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const isSuperAdmin = user.role === 'admin';
                        const isSupplier = user.role === 'supplier';
                        const isSalesperson = user.role === 'salesperson';

                        const initials = user.name
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* User Name & Initials */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                                    isSuperAdmin
                                      ? 'bg-purple-900 text-purple-100 border-purple-700'
                                      : isSupplier
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-slate-900 text-white border-slate-700'
                                  }`}
                                >
                                  {initials || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                    {user.name}
                                    {isSuperAdmin && (
                                      <span className="text-[10px] bg-purple-100 text-purple-900 font-semibold px-1.5 py-0.2 rounded border border-purple-200">
                                        Super
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono truncate">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                  isSuperAdmin
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : isSupplier
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-slate-100 text-slate-800 border-slate-300'
                                }`}
                              >
                                {isSuperAdmin ? 'Super Admin' : isSupplier ? 'Supplier Merchant' : 'Sales Agent'}
                              </span>
                            </td>

                            {/* Contact & Subcity */}
                            <td className="py-3.5 px-4">
                              <div className="font-mono text-slate-800">{user.phone}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {user.subcity} Subcity
                              </div>
                            </td>

                            {/* Commercial Metadata */}
                            <td className="py-3.5 px-4">
                              <div className="text-slate-800 font-medium text-xs">
                                {user.metadata || 'Standard Account'}
                              </div>
                              {user.secondaryMeta && (
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {user.secondaryMeta}
                                </div>
                              )}
                            </td>

                            {/* Account Status */}
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {user.status}
                              </span>
                            </td>

                            {/* Joined Date */}
                            <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SUPPLIER VERIFICATION & KYC */}
          {activeTab === 'verifications' && (
            <div className="glass-card rounded-3xl border border-white/90 overflow-hidden space-y-3">
              <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Supplier Compliance & Commercial Verification
                  </h2>
                  <p className="text-xs text-slate-500">
                    Validate Ethiopian TIN numbers, commercial licenses, and commission reserve obligations.
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {businesses.filter((b) => b.verificationStatus === 'verified').length} / {businesses.length} Verified
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Business / Trade Name</th>
                      <th className="py-3 px-4">Tax ID (TIN) & License</th>
                      <th className="py-3 px-4">Subcity & Address</th>
                      <th className="py-3 px-4 text-right">Escrow Reserve Balance</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {businesses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                          No registered businesses yet. Suppliers who register through the portal will appear here for KYC compliance verification.
                        </td>
                      </tr>
                    ) : (
                      businesses.map((biz) => (
                        <tr key={biz.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{biz.name}</div>
                            <div className="text-[11px] text-slate-500">{biz.tradeName}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div>TIN: {biz.tinNumber}</div>
                            <div className="text-[11px] text-slate-400">{biz.licenseNumber}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-700">{biz.subcity} Subcity</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">{biz.specificLocation}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-numbers font-bold text-slate-900">
                            ETB {Number(biz.commissionReserveBalance || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                              biz.verificationStatus === 'verified'
                                ? 'bg-slate-100 text-slate-900 border-slate-300'
                                : biz.verificationStatus === 'pending'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {biz.verificationStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            {biz.verificationStatus !== 'verified' ? (
                              <button
                                onClick={async () => {
                                  setVerifyingBizId(biz.id);
                                  try {
                                    await verifyBusiness(biz.id, 'verified');
                                    setToastMsg({ text: `✓ Verified ${biz.name} KYC and dispatched onboarding invitation SMS!`, type: 'success' });
                                  } catch {
                                    setToastMsg({ text: `Failed to verify ${biz.name}`, type: 'error' });
                                  } finally {
                                    setVerifyingBizId(null);
                                  }
                                }}
                                disabled={verifyingBizId === biz.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-2xs transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                                <span>{verifyingBizId === biz.id ? 'Verifying & Inviting...' : '1-Click Verify & Invite'}</span>
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" /> Verified & Active
                                </span>
                                <button
                                  onClick={() => verifyBusiness(biz.id, 'pending')}
                                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  Re-audit
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: NETWORK WAITLIST */}
          {activeTab === 'waitlist' && (
            <div className="glass-card rounded-3xl border border-white/90 overflow-hidden space-y-3">
              <div className="px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Early Access Cohort Waitlist Management
                  </h2>
                  <p className="text-xs text-slate-500">
                    Review prospective sales agents and suppliers across Addis Ababa. Dispatch priority onboarding invitation SMS.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-full border border-slate-200">
                  {waitlist.filter((w) => w.status === 'invited').length} Invited · {waitlist.filter((w) => w.status === 'waitlisted').length} Pending
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Waitlist #</th>
                      <th className="py-3 px-4">Applicant</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Subcity & Channels</th>
                      <th className="py-3 px-4">Estimated Scale</th>
                      <th className="py-3 px-4 text-center">Referrals</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {waitlist.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                          No waitlist applicants yet. Early access applicants who register via the portal will appear here for priority review.
                        </td>
                      </tr>
                    ) : (
                      waitlist.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            #{item.waitlistNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{item.fullName}</div>
                            <div className="font-mono text-slate-500 text-[11px]">{item.phone}</div>
                            {item.telegramUsername && (
                              <div className="text-slate-700 text-[11px] font-medium">{item.telegramUsername}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                              item.role === 'sales_agent'
                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {item.role === 'sales_agent' ? 'Sales Agent' : 'Supplier'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{item.subcity} Subcity</div>
                            <div className="text-[11px] text-slate-500 max-w-xs truncate">{item.categoryOrChannel}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {item.estimatedScale}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono-numbers font-bold text-slate-900">
                            {item.referralCount}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                              item.status === 'invited'
                                ? 'bg-slate-100 text-slate-900 border-slate-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {item.status !== 'invited' ? (
                              (() => {
                                const matchedBiz = businesses.find(
                                  (b) => b.phone === item.phone || (b.name && b.name.toLowerCase() === item.fullName.toLowerCase())
                                );
                                if (item.role === 'supplier' && matchedBiz && matchedBiz.verificationStatus !== 'verified') {
                                  return (
                                    <button
                                      onClick={async () => {
                                        setInvitingWaitlistId(item.id);
                                        try {
                                          await verifyBusiness(matchedBiz.id, 'verified');
                                          await inviteWaitlistEntry(item.id);
                                          setToastMsg({ text: `✓ 1-Click Verified ${matchedBiz.name} KYC and dispatched invitation SMS!`, type: 'success' });
                                        } catch {
                                          setToastMsg({ text: `Failed to verify ${matchedBiz.name}`, type: 'error' });
                                        } finally {
                                          setInvitingWaitlistId(null);
                                        }
                                      }}
                                      disabled={invitingWaitlistId === item.id}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-2xs transition-colors"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                                      <span>{invitingWaitlistId === item.id ? 'Verifying...' : '1-Click Verify KYC & Invite'}</span>
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    onClick={async () => {
                                      setInvitingWaitlistId(item.id);
                                      try {
                                        await inviteWaitlistEntry(item.id);
                                        setToastMsg({ text: `✓ Dispatched onboarding invitation SMS to ${item.fullName}!`, type: 'success' });
                                      } catch {
                                        setToastMsg({ text: `Failed to invite ${item.fullName}`, type: 'error' });
                                      } finally {
                                        setInvitingWaitlistId(null);
                                      }
                                    }}
                                    disabled={invitingWaitlistId === item.id}
                                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs"
                                  >
                                    {invitingWaitlistId === item.id ? 'Sending SMS...' : 'Send Invitation SMS'}
                                  </button>
                                );
                              })()
                            ) : (
                              <span className="text-[11px] text-slate-800 font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" /> Invited
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: DISPUTE ARBITRATION */}
          {activeTab === 'disputes' && (
            <div className="space-y-4">
              <div className="glass-card rounded-3xl border border-white/90 p-6">
                <h2 className="text-sm font-bold text-slate-900 mb-1">
                  Arbitration & Dispute Resolution Desk
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Investigate customer and agent disputes regarding delayed deliveries, unrecognized Telebirr references, or unpaid commissions.
                </p>

                <div className="space-y-3">
                  {disputes.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No disputes opened. The marketplace is operating with zero active contestations.
                    </div>
                  ) : (
                    disputes.map((disp) => (
                      <div
                        key={disp.id}
                        className="p-4 glass-card-subtle rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              Dispute #{disp.id}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                              disp.status === 'resolved'
                                ? 'bg-slate-100 text-slate-900 border-slate-300'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {disp.status}
                            </span>
                            <span className="text-slate-400 text-xs">·</span>
                            <span className="text-xs text-slate-600 font-medium capitalize">
                              {disp.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-slate-800 font-medium">
                            Initiated by <strong className="text-slate-900">{disp.raisedByName}</strong> ({disp.raisedByRole}) regarding Order #{disp.orderNumber}
                          </div>
                          <div className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 max-w-2xl">
                            "{disp.reason}"
                          </div>
                          {disp.resolutionDecision && (
                            <div className="text-xs text-slate-800 bg-slate-100 p-2.5 rounded-xl border border-slate-200 mt-2">
                              Ruling: <strong>{disp.resolutionDecision}</strong> — {disp.resolutionNote}
                            </div>
                          )}
                        </div>

                        {disp.status !== 'resolved' && (
                          <button
                            onClick={() => setSelectedDisputeId(disp.id)}
                            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shrink-0 shadow-2xs"
                          >
                            Arbitrate Case
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SMS OUTBOX GATEWAY */}
          {activeTab === 'sms' && (
            <div className="glass-card rounded-3xl border border-white/90 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Transactional SMS Dispatch Gateway Log
                  </h2>
                  <p className="text-xs text-slate-500">
                    Real-time delivery status for SMS routed to Ethio Telecom (09...) and Safaricom Ethiopia (07...) handsets.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-800 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  {smsOutbox.length} Dispatches Recorded
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Recipient Phone</th>
                      <th className="py-3 px-4">Gateway Provider</th>
                      <th className="py-3 px-4">Message Body Content</th>
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Handset Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {smsOutbox.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                          No SMS dispatches recorded yet. Outgoing SMS for customer orders, payment accounts, and partner activations will appear here.
                        </td>
                      </tr>
                    ) : (
                      smsOutbox.map((msg) => (
                        <tr key={msg.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {new Date(msg.sentAt).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            {msg.recipientPhone}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {msg.provider}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-mono text-[11px] max-w-md truncate">
                            "{msg.messageBody}"
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {msg.orderNumber || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              {msg.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT LEDGER */}
          {activeTab === 'audit' && (
            <div className="glass-card rounded-3xl border border-white/90 overflow-hidden space-y-3">
              <div className="px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Cryptographic Audit Ledger
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tamper-evident log of all order transitions, payment confirmations, and commission creations.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search audit trail..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 bg-white/90"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Target Entity</th>
                      <th className="py-3 px-4">Event Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                          No audit records found. Real-time actions across the platform will be cryptographically logged here.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{log.actorName}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{log.actorRole}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                            {log.entityType} #{log.entityId}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {log.description}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: 20% PLATFORM FEE & PAYOUTS CLEARINGHOUSE */}
          {activeTab === 'finances' && (
            <div className="space-y-6">
              {/* Header & Policy Explainer */}
              <div className="glass-card rounded-3xl border border-white/90 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-purple-700" />
                    Platform Fee (20%) Take-Rate & Agent Disbursements
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    The platform retains a mandatory 20% cut from every sales agent commission earned on fulfilled orders (agents receive 80% net payout).
                  </p>
                </div>
                <button
                  onClick={() => {
                    refetchFees();
                    setToastMsg({ text: 'Updated platform fees and payouts ledger', type: 'success' });
                  }}
                  disabled={isLoadingFees}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shrink-0 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFees ? 'animate-spin text-purple-700' : ''}`} />
                  <span>Refresh Financials</span>
                </button>
              </div>

              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">20% Fees Incurred</span>
                    <Coins className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    ETB {(platformFeesData?.totals?.totalPlatformFeesIncurred || 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Total 20% commission cut accrued
                  </span>
                </div>

                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Fees Settled (Paid)</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-emerald-700">
                    ETB {(platformFeesData?.totals?.totalPlatformFeesPaid || 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {platformFeesData?.totals?.suppliersPaidCount || 0} suppliers fully settled
                  </span>
                </div>

                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Outstanding Due</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-rose-700">
                    ETB {(platformFeesData?.totals?.totalPlatformFeesOutstanding || 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {platformFeesData?.totals?.suppliersOutstandingCount || 0} suppliers owe balance
                  </span>
                </div>

                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Disbursed to Agents</span>
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    ETB {(platformFeesData?.totals?.totalDisbursedToAgents || 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    80% net payouts via Telebirr / CBE
                  </span>
                </div>
              </div>

              {/* Sub-Tab Navigation Header */}
              <div className="glass-card rounded-3xl border border-white/90 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                  <div className="flex items-center gap-2 p-1 glass-card-subtle rounded-2xl border border-slate-200/80">
                    <button
                      onClick={() => setFeeSubTab('suppliers')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                        feeSubTab === 'suppliers'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🏢 Suppliers Fee Status (Paid vs Unpaid) ({platformFeesData?.suppliers?.length || 0})
                    </button>
                    <button
                      onClick={() => setFeeSubTab('payouts')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                        feeSubTab === 'payouts'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      💸 Sales Agent Payouts ("Who Got Paid") ({platformFeesData?.payouts?.length || 0})
                    </button>
                  </div>
                </div>

                {/* Sub-Tab 1: Suppliers Platform Fee Status */}
                {feeSubTab === 'suppliers' && (
                  <div className="space-y-4">
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        <button
                          onClick={() => setSupplierFeeFilter('all')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                            supplierFeeFilter === 'all'
                              ? 'bg-purple-900 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          All Suppliers ({platformFeesData?.suppliers?.length || 0})
                        </button>
                        <button
                          onClick={() => setSupplierFeeFilter('outstanding')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                            supplierFeeFilter === 'outstanding'
                              ? 'bg-rose-900 text-white'
                              : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          ⚠️ Outstanding Due ({platformFeesData?.suppliers?.filter((s) => s.status === 'OUTSTANDING').length || 0})
                        </button>
                        <button
                          onClick={() => setSupplierFeeFilter('paid')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                            supplierFeeFilter === 'paid'
                              ? 'bg-emerald-900 text-white'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          ✓ Paid in Full ({platformFeesData?.suppliers?.filter((s) => s.status === 'PAID_IN_FULL').length || 0})
                        </button>
                      </div>

                      <div className="relative min-w-[240px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search supplier, phone, or TIN..."
                          value={supplierFeeSearch}
                          onChange={(e) => setSupplierFeeSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-700"
                        />
                      </div>
                    </div>

                    {/* Suppliers Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="py-3 px-4">Supplier / Business</th>
                            <th className="py-3 px-4">Contact & TIN</th>
                            <th className="py-3 px-4 text-center">Fulfilled Orders</th>
                            <th className="py-3 px-4 text-right">Gross Commissions</th>
                            <th className="py-3 px-4 text-right">20% Fee Incurred</th>
                            <th className="py-3 px-4 text-right">Fee Paid</th>
                            <th className="py-3 px-4 text-right">Outstanding Due</th>
                            <th className="py-3 px-4 text-center">Fee Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const filtered = (platformFeesData?.suppliers || []).filter((s) => {
                              if (supplierFeeFilter === 'outstanding' && s.status !== 'OUTSTANDING') return false;
                              if (supplierFeeFilter === 'paid' && s.status !== 'PAID_IN_FULL') return false;
                              if (supplierFeeSearch.trim()) {
                                const q = supplierFeeSearch.toLowerCase();
                                return (
                                  s.name.toLowerCase().includes(q) ||
                                  (s.phone && s.phone.includes(q)) ||
                                  (s.tinNumber && s.tinNumber.includes(q))
                                );
                              }
                              return true;
                            });

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                                    No supplier platform fee records found.
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((s) => (
                              <tr key={s.businessId} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">{s.name}</div>
                                  <div className="text-[11px] text-slate-500">{s.subcity || 'Addis Ababa'} Subcity</div>
                                </td>
                                <td className="py-3.5 px-4 font-mono">
                                  <div className="text-slate-800">{s.phone || '—'}</div>
                                  <div className="text-[10px] text-slate-400">TIN: {s.tinNumber || '—'}</div>
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                                  {s.totalOrdersCount}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                                  ETB {Number(s.totalGrossCommissions).toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-700">
                                  ETB {Number(s.platformFeeIncurred).toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">
                                  ETB {Number(s.platformFeePaid).toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold">
                                  <span className={s.platformFeeOutstanding > 0 ? 'text-rose-700' : 'text-slate-500'}>
                                    ETB {Number(s.platformFeeOutstanding).toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    s.status === 'PAID_IN_FULL'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : s.status === 'OUTSTANDING'
                                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {s.status === 'PAID_IN_FULL'
                                      ? '✓ Paid in Full'
                                      : s.status === 'OUTSTANDING'
                                      ? '⚠️ Unpaid'
                                      : 'No Fees'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                  {s.status === 'OUTSTANDING' ? (
                                    <>
                                      <button
                                        onClick={async () => {
                                          setMarkingPaidBizId(s.businessId);
                                          try {
                                            const res = await commissionsApi.markSupplierFeePaid(
                                              s.businessId,
                                              s.platformFeeOutstanding
                                            );
                                            await refetchFees();
                                            setToastMsg({
                                              text: res.message || `Platform fee marked as PAID for ${s.name}`,
                                              type: 'success',
                                            });
                                          } catch {
                                            setToastMsg({ text: `Failed to mark fee paid for ${s.name}`, type: 'error' });
                                          } finally {
                                            setMarkingPaidBizId(null);
                                          }
                                        }}
                                        disabled={markingPaidBizId === s.businessId}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition-colors"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>{markingPaidBizId === s.businessId ? 'Saving...' : 'Mark Paid'}</span>
                                      </button>

                                      <button
                                        onClick={async () => {
                                          setRemindingBizId(s.businessId);
                                          try {
                                            const res = await commissionsApi.sendFeeReminder(
                                              s.businessId,
                                              s.platformFeeOutstanding
                                            );
                                            setToastMsg({
                                              text: res.message || `Fee reminder sent to ${s.name}`,
                                              type: 'success',
                                            });
                                          } catch {
                                            setToastMsg({ text: `Failed to send reminder to ${s.name}`, type: 'error' });
                                          } finally {
                                            setRemindingBizId(null);
                                          }
                                        }}
                                        disabled={remindingBizId === s.businessId}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors"
                                      >
                                        <Send className="w-3 h-3 text-purple-200" />
                                        <span>{remindingBizId === s.businessId ? 'Sending...' : 'Reminder SMS'}</span>
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> All Settled
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: Sales Agent Payouts ("Who Got Paid") */}
                {feeSubTab === 'payouts' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          Sales Agent Payouts Disbursement Ledger ("Who Got Paid")
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Cryptographically logged net commission disbursements (80%) paid out to salespersons via Telebirr or CBE Bank.
                        </p>
                      </div>

                      <div className="relative min-w-[240px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search agent name, phone, or batch #..."
                          value={payoutSearch}
                          onChange={(e) => setPayoutSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-700"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="py-3 px-4">Recipient Sales Agent</th>
                            <th className="py-3 px-4">Contact & Subcity</th>
                            <th className="py-3 px-4">Batch #</th>
                            <th className="py-3 px-4 text-right">Gross Commission</th>
                            <th className="py-3 px-4 text-right">80% Net Disbursed</th>
                            <th className="py-3 px-4 text-right">20% Platform Fee</th>
                            <th className="py-3 px-4">Payout Method & Account</th>
                            <th className="py-3 px-4">Bank Slip Reference</th>
                            <th className="py-3 px-4">Date Settled</th>
                            <th className="py-3 px-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const filtered = (platformFeesData?.payouts || []).filter((p) => {
                              if (payoutSearch.trim()) {
                                const q = payoutSearch.toLowerCase();
                                return (
                                  p.recipientName.toLowerCase().includes(q) ||
                                  p.recipientPhone.includes(q) ||
                                  p.batchNumber.toLowerCase().includes(q) ||
                                  p.transactionReference.toLowerCase().includes(q)
                                );
                              }
                              return true;
                            });

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={10} className="py-8 text-center text-slate-500 text-xs">
                                    No sales agent payout batches found. When admin settles commissions, disbursement records will display here.
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                  {p.recipientName}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-mono text-slate-700">{p.recipientPhone}</div>
                                  <div className="text-[10px] text-slate-400">{p.recipientSubcity || 'Addis Ababa'} Subcity</div>
                                </td>
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                  {p.batchNumber}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                                  ETB {Number(p.grossCommission).toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                                  ETB {Number(p.netDisbursed).toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-semibold text-purple-700">
                                  ETB {Number(p.platformFeeRetained).toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-slate-800">{p.payoutMethod}</div>
                                  <div className="text-[10px] font-mono text-slate-500">{p.destinationAccount}</div>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-slate-700">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    {p.transactionReference}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                                  {new Date(p.settledAt).toLocaleDateString()}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disbursed
                                  </span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Arbitration Modal */}
      {selectedDisputeId && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-md rounded-3xl border border-white/90 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">
              Issue Binding Dispute Arbitration Ruling
            </h3>
            <p className="text-xs text-slate-600">
              As platform operator, your decision determines fund disbursement from the supplier commission reserve.
            </p>

            <form onSubmit={handleResolveDispute} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Arbitration Decision *
                </label>
                <select
                  required
                  value={disputeDecision}
                  onChange={(e) => setDisputeDecision(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2 bg-white text-slate-900"
                >
                  <option value="">Select binding ruling...</option>
                  <option value="Ruling in favor of Sales Agent (Enforce Commission Settlement)">
                    Ruling in favor of Sales Agent (Force Payout from Reserve)
                  </option>
                  <option value="Ruling in favor of Supplier (Order Cancelled/Fraudulent Evidence)">
                    Ruling in favor of Supplier (Cancel Order & Release Lock)
                  </option>
                  <option value="Ruling in favor of Customer (Refund & Escrow Return)">
                    Ruling in favor of Customer (Refund Instruction Issued)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Arbitration Justification & Note *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the evidence considered (bank statements, call recordings, driver confirmation)..."
                  value={disputeNote}
                  onChange={(e) => setDisputeNote(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDisputeId(null)}
                  className="px-3.5 py-2 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  Record Binding Administrative Ruling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Interactive Portal Notification Toast */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 border ${
            toastMsg.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-800'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toastMsg.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
};
