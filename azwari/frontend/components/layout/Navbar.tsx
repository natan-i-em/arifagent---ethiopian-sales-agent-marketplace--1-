'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Building2, 
  LogOut,
  Layers,
  CreditCard,
  Globe
} from 'lucide-react';

interface NavbarProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { language, toggleLanguage, t } = useLanguage();
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

  // Active role-specific models for quick balances - strict user-scoped resolution
  const currentAgent = currentUser?.role === 'salesperson'
    ? salesPartners.find(sp => sp.id === (currentUser.salespersonId || selectedSalespersonId))
    : null;
  const currentSupplier = currentUser?.role === 'supplier'
    ? businesses.find(b => b.id === (currentUser.supplierId || selectedSupplierId))
    : null;

  const brandHref = !currentUser 
    ? '/' 
    : currentUser.role === 'salesperson' 
    ? '/portal/salesperson' 
    : currentUser.role === 'supplier' 
    ? '/portal/supplier' 
    : '/portal/admin';

  return (
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
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[110px] sm:max-w-none">
                    {currentUser.role === 'salesperson' ? t('nav.agent') : currentUser.role === 'supplier' ? t('nav.merchant') : t('nav.admin')}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-wide hidden xs:inline truncate">
                {t('nav.brandTagline')}
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
                {t('nav.products')}
              </Link>
            </div>
          )}

          {/* Sales Agent View Links */}
          {currentUser?.role === 'salesperson' && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-slate-800">
              <Link
                href="/portal/salesperson"
                className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap font-bold ${
                  pathname.startsWith('/portal/salesperson')
                    ? 'bg-white text-slate-900 shadow-2xs border border-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {t('nav.agentWorkspace')}
              </Link>
            </div>
          )}

          {/* Supplier View Links */}
          {currentUser?.role === 'supplier' && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-slate-800">
              <Link
                href="/portal/supplier"
                className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap font-bold ${
                  pathname.startsWith('/portal/supplier')
                    ? 'bg-white text-slate-900 shadow-2xs border border-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {t('nav.supplierConsole')}
              </Link>
            </div>
          )}

          {/* Admin View Links */}
          {currentUser?.role === 'admin' && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-slate-800">
              <Link
                href="/portal/admin"
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap font-bold ${
                  pathname.startsWith('/portal/admin')
                    ? 'bg-white text-slate-900 shadow-2xs border border-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {t('nav.adminConsole')}
              </Link>
            </div>
          )}
        </nav>

        {/* Zone 3: Authentication & Profile Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language Switcher Toggle */}
          <button
            onClick={toggleLanguage}
            type="button"
            title={language === 'en' ? 'ወደ አማርኛ ቀይር (Switch to Amharic)' : 'Switch to English'}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 transition-all shadow-2xs text-xs font-semibold"
          >
            <Globe className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="font-bold text-[11px] sm:text-xs">{language === 'en' ? 'አማርኛ' : 'English'}</span>
          </button>
          {!currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/signin"
                onClick={() => setAuthRolePreference('salesperson')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  pathname === '/signin'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white/90 text-slate-800 border-slate-200 hover:border-slate-400 hover:bg-white'
                }`}
              >
                {t('nav.signIn')}
              </Link>

              <Link
                href="/signup"
                onClick={() => setAuthRolePreference('salesperson')}
                className={`hidden xs:flex px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs items-center gap-1.5 ${
                  pathname === '/signup'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <span>{t('nav.getStarted')}</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Profile Pill */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
                <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="font-bold text-slate-900 text-xs leading-tight truncate max-w-[90px] sm:max-w-[120px] hidden xs:inline">
                  {currentUser.name}
                </span>
              </div>

              {/* Sign Out Button (Visible on both Mobile and Desktop) */}
              <button
                onClick={logout}
                title="Sign out of Azwari"
                className="flex px-2 sm:px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-all items-center gap-1.5 shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('nav.signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
