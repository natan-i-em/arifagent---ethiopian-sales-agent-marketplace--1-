'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/context/NotificationContext';
import { useApp } from '@/context/AppContext';
import {
  Bell,
  BellRing,
  X,
  Check,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  ExternalLink,
  ShoppingCart,
  Package,
  CreditCard,
  AlertTriangle,
  Coins,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { AppNotification, NotificationType, NotificationSeverity } from '@/types';

interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterDrawer: React.FC<NotificationCenterDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    unreadCount,
    pushPermission,
    requestPushPermission,
    soundEnabled,
    setSoundEnabled,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications();

  const { currentUser } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isRequestingPush, setIsRequestingPush] = useState(false);

  if (!isOpen) return null;

  // Filter notifications by category
  const filteredNotifications = notifications.filter((notif) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unread') return !notif.read;
    if (selectedFilter === 'order') return notif.type === 'order';
    if (selectedFilter === 'inventory') return notif.type === 'inventory';
    if (selectedFilter === 'wallet') return notif.type === 'wallet' || notif.type === 'escrow';
    if (selectedFilter === 'dispute') return notif.type === 'dispute';
    return true;
  });

  const handlePushEnable = async () => {
    setIsRequestingPush(true);
    await requestPushPermission();
    setIsRequestingPush(false);
  };

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'success':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getNotificationIcon = (type: NotificationType, severity: NotificationSeverity) => {
    const baseClass = "w-4 h-4";
    switch (type) {
      case 'inventory':
        return <Package className={`${baseClass} text-amber-600`} />;
      case 'wallet':
        return <CreditCard className={`${baseClass} text-rose-600`} />;
      case 'escrow':
        return <Coins className={`${baseClass} text-emerald-600`} />;
      case 'dispute':
        return <AlertTriangle className={`${baseClass} text-rose-600`} />;
      case 'order':
        return <ShoppingCart className={`${baseClass} text-blue-600`} />;
      case 'system':
      default:
        return <ShieldCheck className={`${baseClass} text-purple-600`} />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside
        aria-label="Notifications Center"
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-250 border-l border-slate-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <BellRing className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-base leading-none">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono-numbers text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {currentUser?.role === 'supplier'
                  ? 'Merchant Orders, Stock & Reserve Alerts'
                  : currentUser?.role === 'salesperson'
                  ? 'Agent Commissions, Orders & Stock Alerts'
                  : 'Platform Central Alerts & Arbitration'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute notification chimes' : 'Unmute notification chimes'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close notification panel"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Browser Push Permission Banner (if not yet granted) */}
        {pushPermission !== 'granted' && (
          <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/80 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Enable Push Notifications
                </span>
                <p className="text-[11px] text-amber-900/80 leading-snug">
                  Get instant mobile and desktop alerts when orders arrive, wallet is low, or stock drops.
                </p>
              </div>
              <button
                onClick={handlePushEnable}
                disabled={isRequestingPush}
                className="shrink-0 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors"
              >
                {isRequestingPush ? 'Enabling...' : 'Enable'}
              </button>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'order', label: 'Orders' },
            { id: 'wallet', label: 'Wallet & Escrow' },
            { id: 'inventory', label: 'Stock Alerts' },
            { id: 'dispute', label: 'Disputes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{filteredNotifications.length} items</span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-950 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Notification List Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 sm:p-3 space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 stroke-1 text-slate-400" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800 text-sm">All caught up!</p>
                <p className="text-slate-500 text-xs max-w-xs mx-auto">
                  No notifications match your current filter. Real-time alerts for orders, stock, and wallet updates will appear here.
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-2xl transition-all border ${
                  notif.read
                    ? 'bg-white border-slate-200/60 shadow-2xs'
                    : 'bg-emerald-50/20 border-emerald-200/70 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Category Icon */}
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        notif.type === 'inventory'
                          ? 'bg-amber-100'
                          : notif.type === 'wallet' || notif.type === 'dispute'
                          ? 'bg-rose-100'
                          : notif.type === 'escrow'
                          ? 'bg-emerald-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      {getNotificationIcon(notif.type, notif.severity)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs leading-snug">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatRelativeTime(notif.createdAt)}
                        </span>

                        <div className="flex items-center gap-2">
                          {notif.link && (
                            <Link
                              href={notif.link}
                              onClick={() => {
                                markAsRead(notif.id);
                                onClose();
                              }}
                              className="font-bold text-slate-900 hover:text-emerald-700 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              <span>View</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          )}

                          {!notif.read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              title="Mark as read"
                              className="text-slate-400 hover:text-slate-800 p-0.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => clearNotification(notif.id)}
                            title="Delete notification"
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-[10px] text-slate-400 shrink-0">
          <span>Azwari Real-Time Alert Dispatcher · Addis Ababa, Ethiopia</span>
        </div>
      </aside>
    </div>
  );
};
