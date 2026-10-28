'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AppNotification, NotificationType, NotificationSeverity } from '../types';
import { playNotificationSound } from '../lib/sound';
import { useAuth } from './AuthContext';

interface SendNotificationInput {
  recipientRole: 'salesperson' | 'supplier' | 'admin' | 'all';
  recipientId?: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  link?: string;
  metadata?: AppNotification['metadata'];
}

interface NotificationContextType {
  notifications: AppNotification[];
  allNotifications: AppNotification[];
  unreadCount: number;
  pushPermission: NotificationPermission;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  activeToast: AppNotification | null;
  dismissToast: () => void;
  requestPushPermission: () => Promise<boolean>;
  sendNotification: (input: SendNotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const STORAGE_KEY = 'azwari_notifications_store_v1';
const SOUND_PREF_KEY = 'azwari_sound_enabled';

// Realistic initial seed notifications tailored to the Ethiopian multi-party workflow
const INITIAL_SEEDS: AppNotification[] = [
  // Supplier Seed Alerts
  {
    id: 'notif_sup_wallet_1',
    recipientRole: 'supplier',
    type: 'wallet',
    title: 'Low Reserve Warning',
    message: 'Your commission reserve balance is below ETB 5,000 (currently ETB 4,200). Deposit reserve funds to prevent automatic order lock.',
    severity: 'urgent',
    link: '/portal/supplier?tab=wallet',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
    metadata: { amount: 4200 }
  },
  {
    id: 'notif_sup_stock_1',
    recipientRole: 'supplier',
    type: 'inventory',
    title: 'Low Stock Alert',
    message: 'Ethiopian Full-Grain Leather Briefcase has only 3 units remaining in Bole fulfillment center. Restock soon to prevent order rejections.',
    severity: 'warning',
    link: '/portal/supplier?tab=products',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(), // 42 mins ago
    metadata: { stockRemaining: 3, productName: 'Ethiopian Full-Grain Leather Briefcase' }
  },
  {
    id: 'notif_sup_dispute_1',
    recipientRole: 'supplier',
    type: 'dispute',
    title: 'Dispute Filed on Order #ORD-8285',
    message: 'Buyer raised a dispute: "Delivery delayed past 24-hr commitment". Central Escrow Arbitration is reviewing payment lock.',
    severity: 'urgent',
    link: '/portal/supplier?tab=orders',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    metadata: { orderNumber: 'ORD-8285', disputeId: 'disp_001' }
  },
  {
    id: 'notif_sup_order_1',
    recipientRole: 'supplier',
    type: 'order',
    title: 'New Customer Order #ORD-8291',
    message: 'Customer Dawit Haile placed an order via Agent Almaz Mengistu. Telebirr payment evidence submitted for review.',
    severity: 'info',
    link: '/portal/supplier?tab=orders',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    metadata: { orderNumber: 'ORD-8291', amount: 3850 }
  },

  // Sales Agent Seed Alerts
  {
    id: 'notif_agt_escrow_1',
    recipientRole: 'salesperson',
    type: 'escrow',
    title: 'Commissions Ready for Payout',
    message: 'ETB 2,450 in commission escrow cleared following confirmed delivery of Order #ORD-8274. Ready for instant Telebirr/CBE payout.',
    severity: 'success',
    link: '/portal/salesperson?tab=payouts',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    metadata: { amount: 2450 }
  },
  {
    id: 'notif_agt_order_1',
    recipientRole: 'salesperson',
    type: 'order',
    title: 'Payment Verified for Your Lead',
    message: 'Merchant approved payment for Order #ORD-8291. Driver dispatched to Bole Medhanialem for delivery.',
    severity: 'info',
    link: '/portal/salesperson?tab=orders',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    metadata: { orderNumber: 'ORD-8291' }
  },
  {
    id: 'notif_agt_stock_1',
    recipientRole: 'salesperson',
    type: 'inventory',
    title: 'High-Demand Product Low Stock',
    message: 'Yirgacheffe Single-Origin Roast (Grade 1) is down to 4 units in supplier stock. Close your buyer leads before sellout!',
    severity: 'warning',
    link: '/portal/salesperson?tab=offers',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    metadata: { stockRemaining: 4, productName: 'Yirgacheffe Single-Origin Roast' }
  },
  {
    id: 'notif_agt_dispute_1',
    recipientRole: 'salesperson',
    type: 'dispute',
    title: 'Dispute Status Notice',
    message: 'Arbitration opened for customer order #ORD-8285. Commission of ETB 550 temporarily held in escrow pending resolution.',
    severity: 'urgent',
    link: '/portal/salesperson?tab=disputes',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    metadata: { orderNumber: 'ORD-8285' }
  },

  // Admin Central Alerts
  {
    id: 'notif_adm_dispute_1',
    recipientRole: 'admin',
    type: 'dispute',
    title: 'Central Arbitration Required',
    message: 'Dispute #DISP-001 opened for Order #ORD-8285 requires clearinghouse review and escrow disposition.',
    severity: 'urgent',
    link: '/portal/admin?tab=disputes',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: 'notif_adm_kyc_1',
    recipientRole: 'admin',
    type: 'system',
    title: 'New Merchant TIN Verification',
    message: 'Habesha Leather Craft submitted business license and TIN documentation for review.',
    severity: 'info',
    link: '/portal/admin?tab=verifications',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString()
  }
];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Load persisted notifications from sessionStorage
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('[Azwari Notifications] Failed to read sessionStorage:', e);
      }
    }
    return INITIAL_SEEDS;
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = localStorage.getItem(SOUND_PREF_KEY);
        if (val !== null) return val === 'true';
      } catch (e) {}
    }
    return true;
  });

  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // Sync push permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Persist notifications to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(allNotifications));
      } catch (e) {
        console.warn('[Azwari Notifications] Failed to save to sessionStorage:', e);
      }
    }
  }, [allNotifications]);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SOUND_PREF_KEY, String(enabled));
      } catch (e) {}
    }
  };

  // Request native browser Push permission
  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        // Show welcome confirmation push notification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('Azwari Push Notifications Enabled', {
            body: 'You will now receive instant alerts on new orders, low stock, wallet balances, and escrow payouts.',
            icon: '/icon-192x192.png',
            badge: '/favicon-32x32.png',
            data: '/'
          });
        } else {
          new Notification('Azwari Push Notifications Enabled', {
            body: 'You will now receive instant alerts on new orders, low stock, wallet balances, and escrow payouts.',
            icon: '/icon-192x192.png'
          });
        }
        playNotificationSound('success');
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[Azwari Notifications] Error requesting permission:', e);
      return false;
    }
  };

  // Send a new notification
  const sendNotification = useCallback((input: SendNotificationInput) => {
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...input,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setAllNotifications((prev) => [newNotif, ...prev]);

    // Show in-app toast
    setActiveToast(newNotif);

    // Audio chime & vibration
    if (soundEnabled) {
      playNotificationSound(newNotif.severity);
    }

    // Native Browser Notification for PWA / background
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(newNotif.title, {
              body: newNotif.message,
              icon: '/icon-192x192.png',
              badge: '/favicon-32x32.png',
              data: newNotif.link || '/',
            });
          });
        } else {
          new Notification(newNotif.title, {
            body: newNotif.message,
            icon: '/icon-192x192.png',
          });
        }
      } catch (e) {
        console.warn('[Azwari Notifications] Failed to fire native push:', e);
      }
    }
  }, [soundEnabled]);

  // Mark single notification as read
  const markAsRead = useCallback((id: string) => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all relevant notifications as read
  const markAllAsRead = useCallback(() => {
    setAllNotifications((prev) =>
      prev.map((n) => {
        if (!currentUser) return { ...n, read: true };
        if (n.recipientRole === 'all' || n.recipientRole === currentUser.role) {
          return { ...n, read: true };
        }
        return n;
      })
    );
  }, [currentUser]);

  // Remove single notification
  const clearNotification = useCallback((id: string) => {
    setAllNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    if (!currentUser) {
      setAllNotifications([]);
    } else {
      setAllNotifications((prev) =>
        prev.filter((n) => n.recipientRole !== 'all' && n.recipientRole !== currentUser.role)
      );
    }
  }, [currentUser]);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Filter notifications visible to the active user's role
  const notifications = useMemo(() => {
    if (!currentUser) {
      // Unauthenticated visitors see general system & welcome alerts
      return allNotifications.filter((n) => n.recipientRole === 'all');
    }
    return allNotifications.filter(
      (n) => n.recipientRole === 'all' || n.recipientRole === currentUser.role
    );
  }, [allNotifications, currentUser]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        allNotifications,
        unreadCount,
        pushPermission,
        soundEnabled,
        setSoundEnabled,
        activeToast,
        dismissToast,
        requestPushPermission,
        sendNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
