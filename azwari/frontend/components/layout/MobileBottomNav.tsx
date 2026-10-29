'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  ShoppingBag,
  Search,
  LogIn,
  Sparkles,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Coins,
  CreditCard,
  Users,
  ShieldCheck,
  AlertTriangle,
  BarChart3
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { currentUser, setAuthRolePreference } = useApp();

  // Role detection
  const isMarketplace = pathname === '/';
  const isTrack = pathname.startsWith('/track');
  const isSignIn = pathname.startsWith('/signin');
  const isSignUp = pathname.startsWith('/signup');
  const isSalesperson = pathname.startsWith('/portal/salesperson');
  const isSupplier = pathname.startsWith('/portal/supplier');
  const isAdmin = pathname.startsWith('/portal/admin');

  // Track active tab within portals
  const [currentTab, setCurrentTab] = useState<string>('overview');

  useEffect(() => {
    const syncTabFromUrl = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab) {
          setCurrentTab(tab);
        } else if (isAdmin) {
          setCurrentTab('analytics');
        } else {
          setCurrentTab('overview');
        }
      }
    };

    syncTabFromUrl();

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: string }>;
      if (customEvent.detail?.tab) {
        setCurrentTab(customEvent.detail.tab);
      } else {
        syncTabFromUrl();
      }
    };

    window.addEventListener('popstate', syncTabFromUrl);
    window.addEventListener('portal-tab-change', handleCustomChange);
    return () => {
      window.removeEventListener('popstate', syncTabFromUrl);
      window.removeEventListener('portal-tab-change', handleCustomChange);
    };
  }, [pathname, isAdmin]);

  // Route directly to portal tab with immediate in-page switch
  const handlePortalTab = (basePath: string, tab: string) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      if (pathname.startsWith(basePath)) {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.pushState({ tab, view: 'portal' }, '', url.toString());
        window.dispatchEvent(new CustomEvent('portal-tab-change', { detail: { tab, basePath } }));
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        router.push(`${basePath}?tab=${tab}`);
      }
    }
  };

  // 1. Unauthenticated Visitor Nav
  if (!currentUser) {
    return (
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-3 items-center gap-1 text-center">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              isMarketplace
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${isMarketplace ? 'bg-slate-900 text-white shadow-xs' : ''}`}>
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Discover</span>
          </Link>

          <Link
            href="/signin"
            onClick={() => setAuthRolePreference('salesperson')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              isSignIn
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${isSignIn ? 'bg-slate-900 text-white shadow-xs' : ''}`}>
              <LogIn className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Sign In</span>
          </Link>

          <Link
            href="/signup"
            onClick={() => setAuthRolePreference('salesperson')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              isSignUp
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${isSignUp ? 'bg-slate-900 text-white shadow-xs' : ''}`}>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] mt-1 tracking-tight font-semibold">Join</span>
          </Link>
        </div>
      </nav>
    );
  }

  // 2. Salesperson (Sales Agent) Bottom Nav: Direct routes to Overview, Offers, Orders, Ledger, Payouts
  if (currentUser.role === 'salesperson') {
    const isTabActive = (tab: string) => isSalesperson && currentTab === tab;

    return (
      <nav
        aria-label="Sales Agent Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-5 items-center gap-1 text-center">
          {/* Tab 1: Overview */}
          <button
            onClick={() => handlePortalTab('/portal/salesperson', 'overview')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isTabActive('overview') ? 'text-emerald-950 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isTabActive('overview') ? 'bg-emerald-600 text-white shadow-xs' : ''}`}>
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Overview</span>
          </button>

          {/* Tab 2: Available Offers */}
          <button
            onClick={() => handlePortalTab('/portal/salesperson', 'offers')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isTabActive('offers') ? 'text-emerald-950 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isTabActive('offers') ? 'bg-emerald-600 text-white shadow-xs' : ''}`}>
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Offers</span>
          </button>

          {/* Tab 3: Orders */}
          <button
            onClick={() => handlePortalTab('/portal/salesperson', 'orders')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isTabActive('orders') ? 'text-emerald-950 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isTabActive('orders') ? 'bg-emerald-600 text-white shadow-xs' : ''}`}>
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Orders</span>
          </button>

          {/* Tab 4: Ledger */}
          <button
            onClick={() => handlePortalTab('/portal/salesperson', 'ledger')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isTabActive('ledger') ? 'text-emerald-950 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isTabActive('ledger') ? 'bg-emerald-600 text-white shadow-xs' : ''}`}>
              <Coins className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Ledger</span>
          </button>

          {/* Tab 5: Payouts */}
          <button
            onClick={() => handlePortalTab('/portal/salesperson', 'payouts')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isTabActive('payouts') ? 'text-emerald-950 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isTabActive('payouts') ? 'bg-emerald-600 text-white shadow-xs' : ''}`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Payouts</span>
          </button>
        </div>
      </nav>
    );
  }

  // 3. Supplier (Merchant) Bottom Nav: Direct routes to Hub, Products, Orders, Settlement, Wallet
  if (currentUser.role === 'supplier') {
    const isTabActive = (tab: string) => isSupplier && currentTab === tab;

    return (
      <nav
        aria-label="Merchant Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-5 items-center gap-1 text-center">
          {/* Tab 1: Hub (Overview) */}
          <button
            onClick={() => handlePortalTab('/portal/supplier', 'overview')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isTabActive('overview') ? 'text-blue-950 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isTabActive('overview') ? 'bg-blue-600 text-white shadow-xs' : ''}`}>
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Hub</span>
          </button>

          {/* Tab 2: Products */}
          <button
            onClick={() => handlePortalTab('/portal/supplier', 'products')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isTabActive('products') ? 'text-blue-950 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isTabActive('products') ? 'bg-blue-600 text-white shadow-xs' : ''}`}>
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Products</span>
          </button>

          {/* Tab 3: Orders */}
          <button
            onClick={() => handlePortalTab('/portal/supplier', 'orders')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isTabActive('orders') ? 'text-blue-950 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isTabActive('orders') ? 'bg-blue-600 text-white shadow-xs' : ''}`}>
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Orders</span>
          </button>

          {/* Tab 4: Settlement */}
          <button
            onClick={() => handlePortalTab('/portal/supplier', 'settlement')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isTabActive('settlement') ? 'text-blue-950 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isTabActive('settlement') ? 'bg-blue-600 text-white shadow-xs' : ''}`}>
              <Coins className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Settlement</span>
          </button>

          {/* Tab 5: Wallet */}
          <button
            onClick={() => handlePortalTab('/portal/supplier', 'wallet')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isTabActive('wallet') ? 'text-blue-950 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isTabActive('wallet') ? 'bg-blue-600 text-white shadow-xs' : ''}`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Wallet</span>
          </button>
        </div>
      </nav>
    );
  }

  // 4. Admin Bottom Nav: Direct routes to Analytics, Users, Verifications, Disputes, Finances
  const isAdminTabActive = (tab: string) => isAdmin && currentTab === tab;

  return (
    <nav
      aria-label="Admin Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="grid grid-cols-5 items-center gap-1 text-center">
        {/* Tab 1: Analytics */}
        <button
          onClick={() => handlePortalTab('/portal/admin', 'analytics')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
            isAdminTabActive('analytics') ? 'text-purple-950 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isAdminTabActive('analytics') ? 'bg-purple-600 text-white shadow-xs' : ''}`}>
            <BarChart3 className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-1 truncate max-w-full">Analytics</span>
        </button>

        {/* Tab 2: Users */}
        <button
          onClick={() => handlePortalTab('/portal/admin', 'users')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
            isAdminTabActive('users') ? 'text-purple-950 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isAdminTabActive('users') ? 'bg-purple-600 text-white shadow-xs' : ''}`}>
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-1 truncate max-w-full">Users</span>
        </button>

        {/* Tab 3: Verifications */}
        <button
          onClick={() => handlePortalTab('/portal/admin', 'verifications')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
            isAdminTabActive('verifications') ? 'text-purple-950 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isAdminTabActive('verifications') ? 'bg-purple-600 text-white shadow-xs' : ''}`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-1 truncate max-w-full">KYC</span>
        </button>

        {/* Tab 4: Disputes */}
        <button
          onClick={() => handlePortalTab('/portal/admin', 'disputes')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
            isAdminTabActive('disputes') ? 'text-purple-950 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isAdminTabActive('disputes') ? 'bg-purple-600 text-white shadow-xs' : ''}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-1 truncate max-w-full">Disputes</span>
        </button>

        {/* Tab 5: Finances */}
        <button
          onClick={() => handlePortalTab('/portal/admin', 'finances')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
            isAdminTabActive('finances') ? 'text-purple-950 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isAdminTabActive('finances') ? 'bg-purple-600 text-white shadow-xs' : ''}`}>
            <Coins className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-1 truncate max-w-full">Finances</span>
        </button>
      </div>
    </nav>
  );
};
