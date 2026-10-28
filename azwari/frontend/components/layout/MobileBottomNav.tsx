'use client';

import React from 'react';
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
  Building2,
  UserCheck,
  ShieldCheck,
  Menu
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMobileMenu }) => {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { currentUser, setAuthRolePreference } = useApp();

  // Determine active tab from search params or path
  const isMarketplace = pathname === '/';
  const isTrack = pathname.startsWith('/track');
  const isSignIn = pathname.startsWith('/signin');
  const isSignUp = pathname.startsWith('/signup');
  const isSalesperson = pathname.startsWith('/portal/salesperson');
  const isSupplier = pathname.startsWith('/portal/supplier');
  const isAdmin = pathname.startsWith('/portal/admin');

  // Helper to handle portal navigation with query tab
  const handlePortalTab = (basePath: string, tab: string) => {
    router.push(`${basePath}?tab=${tab}`);
  };

  // 1. Unauthenticated Visitor Nav
  if (!currentUser) {
    return (
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-4 items-center gap-1 text-center">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              isMarketplace
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-lg ${isMarketplace ? 'bg-slate-900 text-white' : ''}`}>
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Discover</span>
          </Link>

          <Link
            href="/track"
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              isTrack
                ? 'text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-lg ${isTrack ? 'bg-slate-900 text-white' : ''}`}>
              <Search className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Track Order</span>
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
            <div className={`p-1 rounded-lg ${isSignIn ? 'bg-slate-900 text-white' : ''}`}>
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
            <div className={`p-1 rounded-lg ${isSignUp ? 'bg-slate-900 text-white' : ''}`}>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] mt-1 tracking-tight font-semibold">Join</span>
          </Link>
        </div>
      </nav>
    );
  }

  // 2. Salesperson (Sales Agent) Bottom Nav
  if (currentUser.role === 'salesperson') {
    return (
      <nav
        aria-label="Sales Agent Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-5 items-center gap-1 text-center">
          <button
            onClick={() => handlePortalTab('/portal/salesperson', 'overview')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isSalesperson ? 'text-emerald-950 font-bold' : 'text-slate-500'
            }`}
          >
            <div className={`p-1 rounded-lg ${isSalesperson ? 'bg-emerald-600 text-white' : ''}`}>
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Home</span>
          </button>

          <button
            onClick={() => handlePortalTab('/portal/salesperson', 'offers')}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
          >
            <Package className="w-4 h-4" />
            <span className="text-[10px] mt-1 truncate max-w-full">Offers</span>
          </button>

          <button
            onClick={() => handlePortalTab('/portal/salesperson', 'orders')}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-[10px] mt-1 truncate max-w-full">Orders</span>
          </button>

          <button
            onClick={() => handlePortalTab('/portal/salesperson', 'payouts')}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
          >
            <Coins className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] mt-1 truncate max-w-full">Payouts</span>
          </button>

          <button
            onClick={onOpenMobileMenu}
            aria-label="Open mobile menu"
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px] mt-1 truncate max-w-full">Menu</span>
          </button>
        </div>
      </nav>
    );
  }

  // 3. Supplier (Merchant) Bottom Nav
  if (currentUser.role === 'supplier') {
    return (
      <nav
        aria-label="Merchant Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-5 items-center gap-1 text-center">
          <button
            onClick={() => handlePortalTab('/portal/supplier', 'overview')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              isSupplier ? 'text-blue-950 font-bold' : 'text-slate-500'
            }`}
          >
            <div className={`p-1 rounded-lg ${isSupplier ? 'bg-blue-600 text-white' : ''}`}>
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-1 truncate max-w-full">Hub</span>
          </button>

          <button
            onClick={() => handlePortalTab('/portal/supplier', 'products')}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
          >
            <Package className="w-4 h-4" />
            <span className="text-[10px] mt-1 truncate max-w-full">Products</span>
          </button>

          <button
            onClick={() => handlePortalTab('/portal/supplier', 'orders')}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-[10px] mt-1 truncate max-w-full">Orders</span>
          </button>

          <button
            onClick={() => handlePortalTab('/portal/supplier', 'wallet')}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
          >
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] mt-1 truncate max-w-full">Wallet</span>
          </button>

          <button
            onClick={onOpenMobileMenu}
            aria-label="Open mobile menu"
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px] mt-1 truncate max-w-full">Menu</span>
          </button>
        </div>
      </nav>
    );
  }

  // 4. Admin Bottom Nav
  return (
    <nav
      aria-label="Admin Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="grid grid-cols-5 items-center gap-1 text-center">
        <button
          onClick={() => handlePortalTab('/portal/admin', 'analytics')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
            isAdmin ? 'text-purple-950 font-bold' : 'text-slate-500'
          }`}
        >
          <div className={`p-1 rounded-lg ${isAdmin ? 'bg-purple-600 text-white' : ''}`}>
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-1 truncate max-w-full">Analytics</span>
        </button>

        <button
          onClick={() => handlePortalTab('/portal/admin', 'suppliers')}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
        >
          <Building2 className="w-4 h-4" />
          <span className="text-[10px] mt-1 truncate max-w-full">Merchants</span>
        </button>

        <button
          onClick={() => handlePortalTab('/portal/admin', 'agents')}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
        >
          <UserCheck className="w-4 h-4" />
          <span className="text-[10px] mt-1 truncate max-w-full">Agents</span>
        </button>

        <button
          onClick={() => handlePortalTab('/portal/admin', 'disputes')}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
        >
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <span className="text-[10px] mt-1 truncate max-w-full">Escrow</span>
        </button>

        <button
          onClick={onOpenMobileMenu}
          aria-label="Open mobile menu"
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px] mt-1 truncate max-w-full">Menu</span>
        </button>
      </div>
    </nav>
  );
};
