'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  LogOut,
  Layers,
  ShoppingBag,
  Search,
  Sparkles,
  CreditCard,
  Menu,
  X,
  LogIn,
  ArrowRight,
  Coins
} from 'lucide-react';

interface NavbarProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mobileMenuOpen: controlledOpen,
  setMobileMenuOpen: setControlledOpen
}) => {
  const { 
    currentUser, 
    logout,
    salesPartners,
    businesses,
    selectedSalespersonId,
    selectedSupplierId,
    setAuthRolePreference
  } = useApp();

  const pathname = usePathname() || '/';
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);

  const isMenuOpen = controlledOpen !== undefined ? controlledOpen : internalMenuOpen;
  const setIsMenuOpen = setControlledOpen || setInternalMenuOpen;

  // Active role-specific models
  const currentAgent = salesPartners.find(sp => sp.id === (currentUser?.salespersonId || selectedSalespersonId)) || salesPartners[0];
  const currentSupplier = businesses.find(b => b.id === (currentUser?.supplierId || selectedSupplierId)) || businesses[0];

  const brandHref = !currentUser 
    ? '/' 
    : currentUser.role === 'salesperson' 
    ? '/portal/salesperson' 
    : currentUser.role === 'supplier' 
    ? '/portal/supplier' 
    : '/portal/admin';

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 glass-nav border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Zone 1: Brand Wordmark & Role Context Badge */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <Link 
              href={brandHref} 
              className="flex items-center gap-2 text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-xs border border-slate-800 shrink-0">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors whitespace-nowrap leading-tight">
                    Azwari
                  </span>
                  {currentUser && (
                    <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border truncate max-w-[110px] sm:max-w-none ${
                      currentUser.role === 'salesperson'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : currentUser.role === 'supplier'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-purple-50 text-purple-800 border-purple-200'
                    }`}>
                      {currentUser.role === 'salesperson' ? 'Agent' : currentUser.role === 'supplier' ? 'Merchant' : 'Admin'}
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-wide hidden xs:inline truncate">
                  Commerce & Escrow Ethiopia
                </span>
              </div>
            </Link>
          </div>

          {/* Zone 2: Navigation Links (Desktop Only) */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
            {/* Unauthenticated Navigation */}
            {!currentUser && (
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
                <Link
                  href="/"
                  className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    pathname === '/' 
                      ? 'bg-white text-slate-900 shadow-2xs font-bold border border-white/80' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  Marketplace Discovery
                </Link>
                <Link
                  href="/track"
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    pathname.startsWith('/track')
                      ? 'bg-white text-slate-900 shadow-2xs font-bold border border-white/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  Track Order
                </Link>
              </div>
            )}

            {/* Sales Agent View Links */}
            {currentUser?.role === 'salesperson' && (
              <div className="flex items-center gap-1.5 bg-emerald-50/80 p-1 rounded-xl border border-emerald-200/60 text-emerald-950">
                <Link
                  href="/portal/salesperson"
                  className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap font-bold ${
                    pathname.startsWith('/portal/salesperson')
                      ? 'bg-white text-emerald-900 shadow-2xs border border-white'
                      : 'text-emerald-800 hover:bg-white/60'
                  }`}
                >
                  Agent Workspace & Catalog
                </Link>
              </div>
            )}

            {/* Supplier View Links */}
            {currentUser?.role === 'supplier' && (
              <div className="flex items-center gap-1.5 bg-blue-50/80 p-1 rounded-xl border border-blue-200/60 text-blue-950">
                <Link
                  href="/portal/supplier"
                  className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap font-bold ${
                    pathname.startsWith('/portal/supplier')
                      ? 'bg-white text-blue-900 shadow-2xs border border-white'
                      : 'text-blue-800 hover:bg-white/60'
                  }`}
                >
                  Supplier Operations & Fulfillment
                </Link>
              </div>
            )}

            {/* Admin View Links */}
            {currentUser?.role === 'admin' && (
              <div className="flex items-center gap-1.5 bg-purple-50/80 p-1 rounded-xl border border-purple-200/60 text-purple-950">
                <Link
                  href="/portal/admin"
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap font-bold ${
                    pathname.startsWith('/portal/admin')
                      ? 'bg-white text-purple-900 shadow-2xs border border-white'
                      : 'text-purple-800 hover:bg-white/60'
                  }`}
                >
                  Escrow Clearinghouse & Central Arbitration
                </Link>
              </div>
            )}
          </nav>

          {/* Zone 3: Authentication, Profile & Mobile Hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop Auth Actions */}
            {!currentUser ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/signin"
                  onClick={() => setAuthRolePreference('salesperson')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    pathname === '/signin'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white/90 text-slate-800 border-slate-200 hover:border-slate-400 hover:bg-white'
                  }`}
                >
                  Sign In
                </Link>

                <Link
                  href="/signup"
                  onClick={() => setAuthRolePreference('salesperson')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                    pathname === '/signup'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>Get Started</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Agent Balance Indicator */}
                {currentUser.role === 'salesperson' && currentAgent && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900 font-semibold">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                    <span>ETB {currentAgent.eligibleCommissions.toLocaleString()}</span>
                  </div>
                )}

                {/* Supplier Reserve Indicator */}
                {currentUser.role === 'supplier' && currentSupplier && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-blue-700" />
                    <span>ETB {currentSupplier.commissionReserveBalance.toLocaleString()}</span>
                  </div>
                )}

                {/* Profile Pill */}
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    {currentUser.name.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-900 text-xs leading-tight truncate max-w-[90px] sm:max-w-[120px] hidden xs:inline">
                    {currentUser.name}
                  </span>
                </div>

                {/* Sign Out Button (Desktop) */}
                <button
                  onClick={logout}
                  title="Sign out of Azwari"
                  className="hidden md:flex px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-all items-center gap-1.5 shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
              className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={closeMenu}
          />

          {/* Drawer Sheet */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl p-5 flex flex-col z-10 overflow-y-auto animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                  <Layers className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 text-base leading-none block">
                    Azwari
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Addis Ababa, Ethiopia</span>
                </div>
              </div>

              <button
                onClick={closeMenu}
                aria-label="Close menu"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card (If logged in) */}
            {currentUser && (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 text-xs truncate block">
                      {currentUser.name}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block">
                      {currentUser.email || currentUser.phone}
                    </span>
                  </div>
                </div>

                {/* Role and Balance Badge */}
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                    {currentUser.role === 'salesperson' ? 'Sales Agent' : currentUser.role === 'supplier' ? 'Merchant' : 'Admin'}
                  </span>

                  {currentUser.role === 'salesperson' && (
                    <span className="font-semibold text-emerald-700 text-[11px] flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      ETB {currentAgent.eligibleCommissions.toLocaleString()}
                    </span>
                  )}

                  {currentUser.role === 'supplier' && (
                    <span className="font-semibold text-blue-700 text-[11px] flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      ETB {currentSupplier.commissionReserveBalance.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Main Navigation Links */}
            <div className="mt-5 space-y-1 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-2">
                Navigation
              </span>

              <Link
                href="/"
                onClick={closeMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  pathname === '/'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Marketplace Discovery</span>
              </Link>

              <Link
                href="/track"
                onClick={closeMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  pathname.startsWith('/track')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Track Order (SMS Link)</span>
              </Link>

              {/* Role Workspaces */}
              <div className="pt-3 mt-3 border-t border-slate-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-2">
                  Workspaces
                </span>

                <Link
                  href="/portal/salesperson"
                  onClick={closeMenu}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    pathname.startsWith('/portal/salesperson')
                      ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Independent Sales Agent</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link
                  href="/portal/supplier"
                  onClick={closeMenu}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors mt-1 ${
                    pathname.startsWith('/portal/supplier')
                      ? 'bg-blue-50 text-blue-950 font-bold border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Merchant & Supplier Console</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link
                  href="/portal/admin"
                  onClick={closeMenu}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors mt-1 ${
                    pathname.startsWith('/portal/admin')
                      ? 'bg-purple-50 text-purple-950 font-bold border border-purple-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Central Escrow Clearinghouse</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Bottom Auth CTA */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              {!currentUser ? (
                <>
                  <Link
                    href="/signin"
                    onClick={() => {
                      setAuthRolePreference('salesperson');
                      closeMenu();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => {
                      setAuthRolePreference('salesperson');
                      closeMenu();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Get Started</span>
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Azwari</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

