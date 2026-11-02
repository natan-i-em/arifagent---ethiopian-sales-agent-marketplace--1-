'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Navbar } from './Navbar';
import { MobileBottomNav } from './MobileBottomNav';
import { SmsNotificationDrawer } from '@/components/common/SmsNotificationDrawer';
import { WaitlistModal } from '@/components/common/WaitlistModal';
import { Layers, X, ShieldAlert, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    currentUser, 
    setCurrentView, 
    permissionError, 
    dismissPermissionError,
    setAuthRolePreference,
    setSelectedCustomerToken,
    logout
  } = useApp();
  const router = useRouter();

  React.useEffect(() => {
    // Automatically detect tokenized SMS checkout link
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        setSelectedCustomerToken(token);
      }
    }
  }, [setSelectedCustomerToken]);

  const handleFooterRoleClick = (role: 'salesperson' | 'supplier' | 'admin') => {
    if (!currentUser) {
      setAuthRolePreference(role);
      setCurrentView('signin');
      router.push('/signin');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentUser.role === role) {
      setCurrentView('portal');
      router.push(`/portal/${role}`);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert(`Access Restricted: Your active session is signed in as a ${currentUser.role === 'salesperson' ? 'Sales Agent' : currentUser.role === 'supplier' ? 'Merchant' : 'Admin'}. Please sign out first to log in with different role credentials.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Strict Role-Based Navbar */}
      <Navbar />

      {/* Permission Restriction Alert Banner */}
      {permissionError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 text-xs shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="font-semibold">{permissionError}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={logout}
                className="font-bold underline hover:text-amber-950 text-[11px]"
              >
                Sign Out & Switch Account
              </button>
              <button
                onClick={dismissPermissionError}
                className="p-1 hover:bg-amber-100 rounded-md text-amber-700"
                aria-label="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Content with safe padding for mobile bottom bar */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Thumb-friendly mobile bottom navigation bar */}
      <MobileBottomNav />

      {/* Interactive Account Registration / Onboarding Modal */}
      <WaitlistModal />

      {/* Floating real-time SMS outbox simulation */}
      <SmsNotificationDrawer />

      {/* Footer - Light Glassmorphism */}
      <footer className="glass-nav py-12 mt-auto text-slate-600 border-t border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  <Layers className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-slate-900 text-sm">Azwari</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Azwari connects Ethiopian product owners with independent sales agents. Operating in Addis Ababa.
              </p>
            </div>

            {/* Column 1: For agents */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                For agents
              </span>
              <ul className="space-y-1.5 text-slate-600">
                <li>
                  <button 
                    onClick={() => handleFooterRoleClick('salesperson')} 
                    className="hover:text-slate-900 transition-colors text-left flex items-center gap-1 group"
                  >
                    <span>Agent portal</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
                <li>
                  <Link href="/#how-it-works" className="hover:text-slate-900 transition-colors block">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link href="/#calculator" className="hover:text-slate-900 transition-colors block">
                    Commission calculator
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: For merchants */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                For merchants
              </span>
              <ul className="space-y-1.5 text-slate-600">
                <li>
                  <button 
                    onClick={() => handleFooterRoleClick('supplier')} 
                    className="hover:text-slate-900 transition-colors text-left flex items-center gap-1 group"
                  >
                    <span>Merchant console</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
                <li>
                  <Link 
                    href="/signup" 
                    onClick={() => setAuthRolePreference('supplier')}
                    className="hover:text-slate-900 transition-colors block"
                  >
                    List a product
                  </Link>
                </li>
                <li>
                  <Link href="/#why-trust" className="hover:text-slate-900 transition-colors block">
                    How the deposit works
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Payments */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                Payments
              </span>
              <ul className="space-y-1.5 text-slate-600">
                <li>Telebirr</li>
                <li>CBE</li>
                <li>Chapa</li>
              </ul>
            </div>

            {/* Column 4: Help */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                Help
              </span>
              <ul className="space-y-1.5 text-slate-600">
                <li>
                  <a href="mailto:support@azwari.et" className="hover:text-slate-900 transition-colors">
                    Contact us
                  </a>
                </li>
                <li>
                  <Link href="/#why-trust" className="hover:text-slate-900 transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>
              © 2026 Azwari PLC. All rights reserved. Addis Ababa, Ethiopia.
            </div>
            <div className="flex items-center gap-4 text-slate-500">
              <span className="hover:text-slate-900 cursor-pointer">Terms of Service</span>
              <span>·</span>
              <span className="hover:text-slate-900 cursor-pointer">Privacy Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [qc] = useState(() => queryClient);
  return (
    <QueryClientProvider client={qc}>
      <AppProvider>
        <LayoutContent>{children}</LayoutContent>
      </AppProvider>
    </QueryClientProvider>
  );
};
