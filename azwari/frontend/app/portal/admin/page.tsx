'use client';

import { useApp } from '@/context/AppContext';
import { AdminView } from '@/components/admin/AdminView';
import { SignInView } from '@/components/auth/SignInView';

export default function AdminPortalPage() {
  const { currentUser, isAuthLoading } = useApp();

  if (isAuthLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Loading admin session...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <SignInView />;
  }

  return <AdminView />;
}
