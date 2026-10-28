'use client';

import React, { useState } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { Bell } from 'lucide-react';
import { NotificationCenterDrawer } from './NotificationCenterDrawer';

export const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label={`View notifications (${unreadCount} unread)`}
        title="Notifications"
        className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors border border-slate-200/80 flex items-center justify-center"
      >
        <Bell className="w-4 h-4 text-slate-800" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold font-mono-numbers flex items-center justify-center shadow-xs animate-in zoom-in-50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenterDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
