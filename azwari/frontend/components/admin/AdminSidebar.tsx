'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  MessageSquareText, 
  FileText, 
  Coins, 
  TrendingUp, 
  Activity, 
  UserPlus, 
  Building2, 
  ChevronRight, 
  X,
  Server,
  Database
} from 'lucide-react';

export type AdminTab = 
  | 'analytics' 
  | 'users' 
  | 'verifications' 
  | 'waitlist' 
  | 'disputes' 
  | 'sms' 
  | 'audit' 
  | 'finances';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  pendingVerificationsCount: number;
  pendingDisputesCount: number;
  waitlistCount: number;
  usersCount: number;
  ordersCount: number;
  totalGMV: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingVerificationsCount,
  pendingDisputesCount,
  waitlistCount,
  usersCount,
  ordersCount,
  totalGMV,
  mobileOpen,
  setMobileOpen,
}) => {
  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'analytics',
      label: 'Detailed Analytics',
      icon: TrendingUp,
    },
    {
      id: 'users',
      label: 'Users Directory',
      icon: Users,
      badge: usersCount,
      badgeColor: 'bg-slate-200 text-slate-800',
    },
    {
      id: 'verifications',
      label: 'Supplier KYC & TIN',
      icon: ShieldCheck,
      badge: pendingVerificationsCount > 0 ? `${pendingVerificationsCount} pending` : undefined,
      badgeColor: 'bg-amber-500 text-white font-bold',
    },
    {
      id: 'waitlist',
      label: 'Network Waitlist',
      icon: UserPlus,
      badge: waitlistCount > 0 ? waitlistCount : undefined,
      badgeColor: 'bg-slate-200 text-slate-800',
    },
    {
      id: 'disputes',
      label: 'Dispute Arbitration',
      icon: AlertTriangle,
      badge: pendingDisputesCount > 0 ? `${pendingDisputesCount} review` : undefined,
      badgeColor: 'bg-rose-600 text-white font-bold',
    },
    {
      id: 'sms',
      label: 'SMS Ethiopia Outbox',
      icon: MessageSquareText,
    },
    {
      id: 'audit',
      label: 'Audit Trail Logs',
      icon: FileText,
    },
    {
      id: 'finances',
      label: 'Escrow Clearinghouse',
      icon: Coins,
    },
  ];

  const handleSelectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Top Header & Navigation */}
      <div className="space-y-6">
        {/* Super Admin Identification Card */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white relative overflow-hidden group shadow-xs">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-purple-500/20 via-amber-400/10 to-transparent rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 border border-white/15">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-white truncate">
                  Platform Operations
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                Addis Ababa Central Node
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-purple-200 bg-purple-950/80 border border-purple-800/80 px-2 py-0.5 rounded-md">
                  Super Admin
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Governance & Compliance
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                      isActive ? 'bg-slate-800 text-white border border-slate-700' : item.badgeColor || 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Platform Metrics & Health */}
      <div className="pt-4 border-t border-slate-200/80 space-y-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-400" /> PostgreSQL
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-md">
              Connected
            </span>
          </div>

          <div>
            <div className="font-mono-numbers text-base font-bold text-white">
              ETB {Number(totalGMV || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Cumulative Platform GMV ({ordersCount} orders)
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              SMS Ethiopia Live
            </span>
            <span className="text-slate-500">v2.4</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 text-center">
          <span>Azwari Governance Engine</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Panel */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-20 glass-card rounded-3xl border border-white/90 p-5 min-h-[calc(100vh-6.5rem)] flex flex-col shadow-xs">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl p-5 flex flex-col z-10 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                Admin Operations Menu
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
