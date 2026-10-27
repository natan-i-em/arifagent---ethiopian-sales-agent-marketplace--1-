'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Coins, 
  CreditCard, 
  AlertTriangle, 
  Plus, 
  ShieldCheck, 
  ChevronRight, 
  X,
  Copy,
  Check,
  UserCheck,
  Sparkles,
  ExternalLink,
  Phone,
  Send
} from 'lucide-react';
import { SalesPartnerProfile } from '../../types';

export type SalespersonTab = 'overview' | 'orders' | 'offers' | 'ledger' | 'payouts' | 'disputes';

interface SalespersonSidebarProps {
  currentAgent: SalesPartnerProfile;
  activeTab: SalespersonTab;
  setActiveTab: (tab: SalespersonTab) => void;
  ordersCount: number;
  activeOffersCount: number;
  ledgerCount: number;
  pendingCommissions: number;
  eligibleCommissions: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onCreateOrderClick: () => void;
}

export const SalespersonSidebar: React.FC<SalespersonSidebarProps> = ({
  currentAgent,
  activeTab,
  setActiveTab,
  ordersCount,
  activeOffersCount,
  ledgerCount,
  pendingCommissions,
  eligibleCommissions,
  mobileOpen,
  setMobileOpen,
  onCreateOrderClick,
}) => {
  const [copiedCode, setCopiedCode] = React.useState(false);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(currentAgent.referralCode || 'ARIF-AGENT');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const navItems: {
    id: SalespersonTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Agent Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'orders',
      label: 'My Orders (Read Only)',
      icon: ShoppingCart,
      badge: ordersCount,
      badgeColor: 'bg-slate-200 text-slate-800',
    },
    {
      id: 'offers',
      label: 'Available Offers',
      icon: Package,
      badge: activeOffersCount,
      badgeColor: 'bg-emerald-100 text-emerald-800 font-semibold',
    },
    {
      id: 'ledger',
      label: 'Commission Ledger',
      icon: Coins,
      badge: ledgerCount,
      badgeColor: 'bg-slate-200 text-slate-800',
    },
    {
      id: 'payouts',
      label: 'Payouts & Banking',
      icon: CreditCard,
      badge: eligibleCommissions > 0 ? `ETB ${eligibleCommissions.toLocaleString()}` : undefined,
      badgeColor: 'bg-emerald-600 text-white font-bold',
    },
    {
      id: 'disputes',
      label: 'Disputes & Support',
      icon: AlertTriangle,
    },
  ];

  const handleSelectTab = (tab: SalespersonTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Top Header & Navigation */}
      <div className="space-y-6">
        {/* Sales Agent Identification Card */}
        <div className="p-4 rounded-2xl glass-card-subtle border border-slate-200/90 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-400/10 via-amber-400/10 to-transparent rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              {currentAgent.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-slate-900 truncate" title={currentAgent.fullName}>
                {currentAgent.fullName}
              </h2>
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                {currentAgent.subcity || 'Bole'}, Addis Ababa
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Agent
                </span>
              </div>
            </div>
          </div>

          {/* Referral Code Chip */}
          <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Referral Code:</span>
            <button
              onClick={handleCopyReferral}
              title="Click to copy your unique referral code"
              className="flex items-center gap-1 font-mono font-bold text-[11px] text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>{currentAgent.referralCode}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick CTA: Create Order */}
        <button
          onClick={() => {
            onCreateOrderClick();
            setMobileOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Create Order for Buyer</span>
        </button>

        {/* Navigation List */}
        <nav className="space-y-1">
          <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Agent Portal
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

      {/* Bottom Financial Commission Card */}
      <div className="pt-4 border-t border-slate-200/80 space-y-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Eligible for Payout
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-md">
              Verified
            </span>
          </div>

          <div>
            <div className="font-mono-numbers text-lg font-bold text-white">
              ETB {Number(eligibleCommissions || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Pending: ETB {Number(pendingCommissions || 0).toLocaleString()}
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {currentAgent.payoutDestination?.provider || 'Telebirr'}
            </span>
            <button
              onClick={() => handleSelectTab('payouts')}
              className="text-amber-300 hover:text-amber-200 font-semibold"
            >
              Payouts →
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
          <span>Azwari Sales Agent Portal v2.4</span>
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
                <UserCheck className="w-4 h-4 text-slate-700" />
                Sales Agent Menu
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
