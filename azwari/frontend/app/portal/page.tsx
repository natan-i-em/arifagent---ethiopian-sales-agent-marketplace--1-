'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function PortalIndexPage() {
  const { currentUser } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/signin');
    } else if (currentUser.role === 'supplier') {
      router.replace('/portal/supplier');
    } else if (currentUser.role === 'salesperson') {
      router.replace('/portal/salesperson');
    } else if (currentUser.role === 'admin') {
      router.replace('/portal/admin');
    } else {
      router.replace('/signin');
    }
  }, [currentUser, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Entering secure workspace...</p>
      </div>
    </div>
  );
}
