'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/context/NotificationContext';
import { AppNotification, NotificationType } from '@/types';
import {
  Bell,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShoppingCart,
  Package,
  CreditCard,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Eye,
  RefreshCw,
  PlusCircle,
  Inbox
} from 'lucide-react';

interface PortalNotificationsTabProps {
  role: 'supplier' | 'salesperson' | 'admin';
  recipientId?: string;
  onOpenModal?: (notification: AppNotification) => void;
}

export const PortalNotificationsTab: React.FC<PortalNotificationsTabProps> = ({
  role,
  recipientId,
  onOpenModal,
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    sendNotification,
    openModalById,
    refetch,
    isRefetching,
  } = useNotifications();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Filtered by role, category, and search query
  const filteredList = useMemo(() => {
    return notifications.filter((notif) => {
      // Role match
      if (notif.recipientRole !== 'all' && notif.recipientRole !== role) {
        return false;
      }

      // Category match
      if (activeCategory === 'unread' && notif.read) return false;
      if (activeCategory === 'order' && notif.type !== 'order') return false;
      if (activeCategory === 'stock' && notif.type !== 'stock' && notif.type !== 'inventory') return false;
      if (activeCategory === 'wallet' && notif.type !== 'wallet' && notif.type !== 'escrow') return false;
      if (activeCategory === 'dispute' && notif.type !== 'dispute') return false;
      if (activeCategory === 'message' && notif.type !== 'message') return false;

      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = notif.title.toLowerCase().includes(q);
        const msgMatch = notif.message.toLowerCase().includes(q);
        const typeMatch = notif.type.toLowerCase().includes(q);
        return titleMatch || msgMatch || typeMatch;
      }

      return true;
    });
  }, [notifications, role, activeCategory, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const roleNotifs = notifications.filter(
      (n) => n.recipientRole === 'all' || n.recipientRole === role
    );
    const unread = roleNotifs.filter((n) => !n.read).length;
    const orders = roleNotifs.filter((n) => n.type === 'order').length;
    const stock = roleNotifs.filter((n) => n.type === 'stock' || n.type === 'inventory').length;
    const wallet = roleNotifs.filter((n) => n.type === 'wallet' || n.type === 'escrow').length;
    const disputes = roleNotifs.filter((n) => n.type === 'dispute').length;

    return { total: roleNotifs.length, unread, orders, stock, wallet, disputes };
  }, [notifications, role]);

  const getIcon = (type: NotificationType) => {
    const cls = "w-4 h-4";
    switch (type) {
      case 'order':
        return <ShoppingCart className={`${cls} text-blue-500`} />;
      case 'stock':
      case 'inventory':
        return <Package className={`${cls} text-amber-500`} />;
      case 'wallet':
      case 'escrow':
        return <CreditCard className={`${cls} text-emerald-500`} />;
      case 'dispute':
        return <AlertTriangle className={`${cls} text-rose-500`} />;
      case 'message':
        return <MessageSquare className={`${cls} text-indigo-500`} />;
      default:
        return <Bell className={`${cls} text-amber-500`} />;
    }
  };

  const formatRelativeTime = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  // Quick simulate button to verify live database push, audio chime & top-right toast!
  const handleSimulateIncoming = async () => {
    setIsSimulating(true);
    try {
      const orderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      if (role === 'supplier') {
        await sendNotification({
          recipientRole: 'supplier',
          recipientId,
          type: 'order',
          title: `New Incoming Order #${orderNum}`,
          message: `Buyer submitted a verified Telebirr payment for 2x Habesha Handcrafted Leather Bags. Ready for Bole dispatch.`,
          severity: 'info',
          link: '/portal/supplier?tab=orders',
          metadata: { orderNumber: orderNum, amount: 4800 },
        });
      } else if (role === 'salesperson') {
        await sendNotification({
          recipientRole: 'salesperson',
          recipientId,
          type: 'wallet',
          title: `Commission Cleared: ETB 960!`,
          message: `Escrow released for order #${orderNum} following confirmed customer delivery. Transferable to CBE/Telebirr.`,
          severity: 'success',
          link: '/portal/salesperson?tab=payouts',
          metadata: { orderNumber: orderNum, amount: 960 },
        });
      } else {
        await sendNotification({
          recipientRole: 'admin',
          recipientId,
          type: 'dispute',
          title: `Escrow Review Flagged: #${orderNum}`,
          message: `Buyer filed delivery claim on #${orderNum}. Automated 24-hr clearinghouse mediation triggered.`,
          severity: 'error',
          link: '/portal/admin?tab=disputes',
          metadata: { orderNumber: orderNum },
        });
      }
    } finally {
      setTimeout(() => setIsSimulating(false), 600);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight">Notification Center</h2>
            {stats.unread > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 animate-pulse">
                {stats.unread} new
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Real-time multi-party alerts on orders, inventory thresholds, commission wallet, and disputes.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleSimulateIncoming}
            disabled={isSimulating}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Push test notification to database & trigger top-right toast"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSimulating ? 'Pushing...' : 'Test Incoming Alert'}</span>
          </button>

          {stats.unread > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark all read</span>
            </button>
          )}

          {stats.total > 0 && (
            <button
              onClick={clearAll}
              className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setActiveCategory('all')}
          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
            activeCategory === 'all'
              ? 'bg-slate-800 border-amber-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {stats.total}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('unread')}
          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
            activeCategory === 'unread'
              ? 'bg-slate-800 border-amber-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
            Unread
          </span>
          <span className="text-xl font-extrabold text-amber-500 mt-1 block">
            {stats.unread}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('order')}
          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
            activeCategory === 'order'
              ? 'bg-slate-800 border-amber-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">
            Orders
          </span>
          <span className="text-xl font-extrabold text-blue-500 mt-1 block">
            {stats.orders}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('stock')}
          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
            activeCategory === 'stock'
              ? 'bg-slate-800 border-amber-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
            Stock Alerts
          </span>
          <span className="text-xl font-extrabold text-amber-600 mt-1 block">
            {stats.stock}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('wallet')}
          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
            activeCategory === 'wallet'
              ? 'bg-slate-800 border-amber-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">
            Wallet & Escrow
          </span>
          <span className="text-xl font-extrabold text-emerald-500 mt-1 block">
            {stats.wallet}
          </span>
        </div>

        <div
          onClick={() => setActiveCategory('dispute')}
          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
            activeCategory === 'dispute'
              ? 'bg-slate-800 border-amber-500/50 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
            Disputes
          </span>
          <span className="text-xl font-extrabold text-rose-500 mt-1 block">
            {stats.disputes}
          </span>
        </div>
      </div>

      {/* Filter Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'order', label: 'Orders' },
            { id: 'stock', label: 'Low Stock' },
            { id: 'wallet', label: 'Wallet & Escrow' },
            { id: 'dispute', label: 'Disputes' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Notifications Table / List */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
              No notifications found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No notifications matched "${searchQuery}". Try a different keyword.`
                : 'All caught up! New order, wallet, dispute, and stock alerts will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  !item.read
                    ? 'bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div
                  className="flex items-start gap-3 flex-1 cursor-pointer min-w-0"
                  onClick={() => {
                    markAsRead(item.id);
                    if (onOpenModal) {
                      onOpenModal(item);
                    } else {
                      openModalById(item.id);
                    }
                  }}
                >
                  <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                    {getIcon(item.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    {item.metadata && Object.keys(item.metadata).length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {Object.entries(item.metadata).map(([k, v]) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => {
                      markAsRead(item.id);
                      if (onOpenModal) {
                        onOpenModal(item);
                      } else {
                        openModalById(item.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="View details in modal"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-500" />
                    <span>View Modal</span>
                  </button>

                  {item.link && (
                    <Link
                      href={item.link}
                      onClick={() => markAsRead(item.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <span>Open Tab</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  <button
                    onClick={() => clearNotification(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
