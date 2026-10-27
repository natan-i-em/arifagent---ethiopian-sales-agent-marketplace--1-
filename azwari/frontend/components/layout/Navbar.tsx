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
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  Search,
  Sparkles,
  CreditCard
} from 'lucide-react';

export const Navbar: React.FC = () => {
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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark & Role Context Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <Link 
            href={brandHref} 
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-xs border border-slate-800">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors whitespace-nowrap leading-tight">
                  Azwari
                </span>
                {currentUser && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    currentUser.role === 'salesperson'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : currentUser.role === 'supplier'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-purple-50 text-purple-800 border-purple-200'
                  }`}>
                    {currentUser.role === 'salesperson' ? 'Agent Workspace' : currentUser.role === 'supplier' ? 'Supplier Console' : 'Central Admin'}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                Commerce & Escrow Ethiopia
              </span>
            </div>
          </Link>
        </div>

        {/* Zone 2: Navigation Links (Strictly Role-Based) */}
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

        {/* Zone 3: Authentication & Profile Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* When Logged Out: Sign In & Sign Up Buttons */}
          {!currentUser ? (
            <div className="flex items-center gap-2">
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
            /* When Logged In: Authenticated Profile & Sign Out */
            <div className="flex items-center gap-3">
              {/* Agent Balance Indicator */}
              {currentUser.role === 'salesperson' && currentAgent && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900 font-semibold">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ETB {currentAgent.eligibleCommissions.toLocaleString()} Eligible</span>
                </div>
              )}

              {/* Supplier Reserve Indicator */}
              {currentUser.role === 'supplier' && currentSupplier && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-blue-700" />
                  <span>Reserve: ETB {currentSupplier.commissionReserveBalance.toLocaleString()}</span>
                </div>
              )}

              {/* Profile Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
                <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="font-bold text-slate-900 text-xs leading-tight truncate max-w-[140px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-none">
                    {currentUser.subcity ? `${currentUser.subcity}, Addis` : currentUser.role}
                  </span>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={logout}
                title="Sign out of Azwari"
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
