'use client';

import React from 'react';
import Link from 'next/link';
import { useNotifications } from '@/context/NotificationContext';
import { X, ExternalLink, Package, CreditCard, Coins, AlertTriangle, ShoppingCart, Bell } from 'lucide-react';
import { NotificationType } from '@/types';

export const NotificationToast: React.FC = () => {
  const { activeToast, dismissToast, markAsRead } = useNotifications();

  if (!activeToast) return null;

  const getIcon = (type: NotificationType) => {
    const cls = "w-4 h-4";
    switch (type) {
      case 'inventory':
        return <Package className={`${cls} text-amber-500`} />;
      case 'wallet':
        return <CreditCard className={`${cls} text-rose-500`} />;
      case 'dispute':
        return <AlertTriangle className={`${cls} text-rose-500`} />;
      case 'escrow':
        return <Coins className={`${cls} text-emerald-500`} />;
      case 'order':
        return <ShoppingCart className={`${cls} text-blue-500`} />;
      default:
        return <Bell className={`${cls} text-amber-500`} />;
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96 animate-in slide-in-from-top-4 duration-300">
      <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 flex items-start gap-3 backdrop-blur-md">
        <div className="p-2 rounded-xl bg-slate-800 shrink-0 mt-0.5">
          {getIcon(activeToast.type)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-xs text-white leading-tight truncate">
              {activeToast.title}
            </span>
            <button
              onClick={dismissToast}
              aria-label="Dismiss toast"
              className="text-slate-400 hover:text-white p-0.5 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-300 mt-1 leading-snug line-clamp-2">
            {activeToast.message}
          </p>

          {activeToast.link && (
            <div className="mt-2.5 flex justify-end">
              <Link
                href={activeToast.link}
                onClick={() => {
                  markAsRead(activeToast.id);
                  dismissToast();
                }}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <span>View Details</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
