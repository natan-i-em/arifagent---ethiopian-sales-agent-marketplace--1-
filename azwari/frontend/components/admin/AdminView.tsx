'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminSidebar, AdminTab } from './AdminSidebar';
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
  RefreshCw
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
      const validTabs: AdminTab[] = ['analytics', 'users', 'verifications', 'waitlist', 'disputes', 'sms', 'audit', 'finances'];
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
      const validTabs: AdminTab[] = ['analytics', 'users', 'verifications', 'waitlist', 'disputes', 'sms', 'audit', 'finances'];
      if (tabParam && validTabs.includes(tabParam)) setActiveTabState(tabParam);
    };
    window.addEventListener('popstate', handleTabPop);
    window.addEventListener('portal-tab-change', handleTabPop);
    return () => {
      window.removeEventListener('popstate', handleTabPop);
      window.removeEventListener('portal-tab-change', handleTabPop);
    };
  }, []);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [disputeDecision, setDisputeDecision] = useState('');
  const [disputeNote, setDisputeNote] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

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
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">Platform Governance & Compliance Desk</h1>
              <span className="text-[11px] font-mono bg-purple-950 text-purple-200 px-2.5 py-0.5 rounded-md border border-purple-800">
                Super Admin Clearance
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Addis Ababa Central Command Node</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PostgreSQL Operational
              </span>
              <span>·</span>
              <span className="text-slate-400">SMS Gateway Live</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="lg:hidden flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/80 text-purple-200 border border-purple-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Escrow Control</span>
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
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
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
                    <span className="text-xs text-slate-500 font-medium">Platform Fee (2%)</span>
                    <Coins className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="font-mono-numbers font-bold text-2xl text-slate-900">
                    ETB {totalPlatformFees.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Marketplace gross revenue
                  </span>
                </div>

                <div className="glass-card p-5 rounded-3xl border border-white/90">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Avg Order Value (AOV)</span>
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
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
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
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
                      <BarChart3 className="w-4 h-4 text-purple-700" />
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
                        <MapPin className="w-4 h-4 text-purple-700" />
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
                      <CreditCard className="w-4 h-4 text-emerald-700" />
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
                                onClick={() => verifyBusiness(biz.id, 'verified')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
                              >
                                Approve KYC
                              </button>
                            ) : (
                              <button
                                onClick={() => verifyBusiness(biz.id, 'pending')}
                                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
                              >
                                Re-audit
                              </button>
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
                              <button
                                onClick={() => inviteWaitlistEntry(item.id)}
                                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs"
                              >
                                Send Invitation SMS
                              </button>
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

          {/* TAB 8: FINANCIAL HEALTH & ESCROW CLEARINGHOUSE */}
          {activeTab === 'finances' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900">
                  Platform Take-Rate Revenue Ledger
                </h2>
                <p className="text-xs text-slate-500">
                  The 2% platform fee charged on completed Ethiopian sales agent transactions.
                </p>

                <div className="space-y-2">
                  {platformFeeLedger.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs glass-card-subtle rounded-2xl border border-slate-200">
                      No platform fees recorded yet. 2% GMV take-rate fees on fulfilled orders will be logged here.
                    </div>
                  ) : (
                    platformFeeLedger.map((fee) => (
                      <div
                        key={fee.id}
                        className="p-3 glass-card-subtle rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900">Order #{fee.orderNumber}</span>
                          <span className="text-slate-500 block text-[11px]">
                            Supplier: {fee.supplierName} (2% of GMV)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono-numbers font-bold text-slate-900">
                            ETB {fee.amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-700 font-semibold block capitalize">
                            {fee.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900">
                  Settlement Batch History
                </h2>
                <p className="text-xs text-slate-500">
                  Cryptographically logged commission disbursements sent to agents via Telebirr & CBE.
                </p>

                <div className="space-y-2">
                  {settlementBatches.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs glass-card-subtle rounded-2xl border border-slate-200">
                      No settlement batches processed yet. Commission payouts to agents via Telebirr & CBE will be recorded here.
                    </div>
                  ) : (
                    settlementBatches.map((batch) => (
                      <div
                        key={batch.id}
                        className="p-3 glass-card-subtle rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900">{batch.batchNumber}</span>
                          <span className="text-slate-500 block text-[11px]">
                            Recipient: {batch.recipientName} ({batch.payoutMethod})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono-numbers font-bold text-slate-900">
                            ETB {batch.totalAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Ref: {batch.transactionReference}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
    </div>
  );
};
