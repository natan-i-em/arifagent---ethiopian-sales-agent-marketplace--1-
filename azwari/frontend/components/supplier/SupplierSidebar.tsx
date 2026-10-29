'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  WalletCards, 
  CreditCard, 
  Settings, 
  Building2, 
  Plus, 
  ShieldCheck, 
  ChevronRight, 
  X,
  ExternalLink,
  Store,
  Layers,
  Sparkles,
  Wallet,
  Bell
} from 'lucide-react';
import { Business, Order, Product } from '../../types';

export type SupplierTab = 'overview' | 'products' | 'orders' | 'notifications' | 'wallet' | 'settlement' | 'accounts' | 'settings';

interface SupplierSidebarProps {
  currentSupplier: Business;
  activeTab: SupplierTab;
  setActiveTab: (tab: SupplierTab) => void;
  productsCount: number;
  ordersCount: number;
  ordersNeedingVerificationCount: number;
  eligibleSettlementCount: number;
  walletBalance?: number;
  unreadNotificationsCount?: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const SupplierSidebar: React.FC<SupplierSidebarProps> = ({
  currentSupplier,
  activeTab,
  setActiveTab,
  productsCount,
  ordersCount,
  ordersNeedingVerificationCount,
  eligibleSettlementCount,
  walletBalance,
  unreadNotificationsCount,
  mobileOpen,
  setMobileOpen,
}) => {
  const displayBalance = walletBalance !== undefined ? walletBalance : (currentSupplier.commissionReserveBalance || 0);
  const navItems: {
    id: SupplierTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Dashboard Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'products',
      label: 'Product Catalog',
      icon: Package,
      badge: productsCount,
      badgeColor: 'bg-slate-200 text-slate-800',
    },
    {
      id: 'orders',
      label: 'Orders & Verification',
      icon: ShoppingCart,
      badge: ordersNeedingVerificationCount > 0 ? `${ordersNeedingVerificationCount} pending` : ordersCount,
      badgeColor: ordersNeedingVerificationCount > 0 ? 'bg-amber-500 text-white font-bold' : 'bg-slate-200 text-slate-800',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount && unreadNotificationsCount > 0 ? `${unreadNotificationsCount} new` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'wallet',
      label: 'Collateral Wallet',
      icon: Wallet,
      badge: displayBalance > 0 ? `ETB ${displayBalance.toLocaleString()}` : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800 font-bold',
    },
    {
      id: 'settlement',
      label: 'Commission Payouts',
      icon: WalletCards,
      badge: eligibleSettlementCount > 0 ? `${eligibleSettlementCount} ready` : undefined,
      badgeColor: 'bg-rose-600 text-white font-bold',
    },
    {
      id: 'accounts',
      label: 'Payment Accounts',
      icon: CreditCard,
      badge: currentSupplier.paymentAccounts?.length || 0,
      badgeColor: 'bg-slate-200 text-slate-800',
    },
    {
      id: 'settings',
      label: 'Settings & Profile',
      icon: Settings,
    },
  ];

  const handleSelectTab = (tab: SupplierTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Top Header & Navigation */}
      <div className="space-y-6">
        {/* Merchant Identification */}
        <div className="p-4 rounded-2xl glass-card-subtle border border-slate-200/90 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/10 via-emerald-400/10 to-transparent rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              <Store className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-900 truncate" title={currentSupplier.name}>
                  {currentSupplier.name}
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                {currentSupplier.subcity}, Addis Ababa
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified TIN
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Merchant Portal
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

      {/* Bottom Escrow Security Balance Card */}
      <div className="pt-4 border-t border-slate-200/80 space-y-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Escrow Reserve
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-md">
              Active Protected
            </span>
          </div>
          <div>
            <div className="font-mono-numbers text-lg font-bold text-white">
              ETB {Number(displayBalance || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Guarantees independent agent commissions
            </div>
          </div>
          <button
            onClick={() => handleSelectTab('wallet')}
            className="w-full text-center text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline pt-1 block"
          >
            Manage Collateral Wallet →
          </button>
        </div>

        <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
          <span>Azwari Merchant Engine v2.4</span>
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
                <Store className="w-4 h-4 text-slate-700" />
                Merchant Menu
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
