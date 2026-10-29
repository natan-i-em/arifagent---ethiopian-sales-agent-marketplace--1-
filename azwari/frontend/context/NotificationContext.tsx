'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppNotification, NotificationType, NotificationSeverity } from '../types';
import { ToastItem, ToastType } from '../types/toast';
import { playNotificationSound } from '../lib/sound';
import { useAuth } from './AuthContext';
import { notificationsApi } from '../lib/api';

export interface SendNotificationInput {
  recipientRole: 'salesperson' | 'supplier' | 'admin' | 'all';
  recipientId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  link?: string | null;
  metadata?: AppNotification['metadata'];
}

export interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  link?: string;
  notificationId?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: AppNotification[];
  allNotifications: AppNotification[];
  unreadCount: number;
  pushPermission: NotificationPermission;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  // Modal state
  selectedModalNotification: AppNotification | null;
  isModalOpen: boolean;
  openModal: (notification: AppNotification) => void;
  openModalById: (id: string) => void;
  closeModal: () => void;
  // Top-Right Toasts
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (title: string, message: string, options?: ToastOptions) => string;
    error: (title: string, message: string, options?: ToastOptions) => string;
    warning: (title: string, message: string, options?: ToastOptions) => string;
    message: (title: string, message: string, options?: ToastOptions) => string;
    info: (title: string, message: string, options?: ToastOptions) => string;
  };
  requestPushPermission: () => Promise<boolean>;
  sendNotification: (input: SendNotificationInput) => Promise<AppNotification | null>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refetch: () => Promise<void>;
  isRefetching: boolean;
}

const STORAGE_KEY = 'azwari_notifications_store_v2';
const SOUND_PREF_KEY = 'azwari_sound_enabled';

const INITIAL_FALLBACK_SEEDS: AppNotification[] = [
  {
    id: 'notif_sup_wallet_1',
    recipientRole: 'supplier',
    type: 'wallet',
    title: 'Low Reserve Warning',
    message: 'Your commission reserve balance is below ETB 5,000 (currently ETB 4,200). Deposit reserve funds to prevent automatic order lock.',
    severity: 'warning',
    link: '/portal/supplier?tab=wallet',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    metadata: { amount: 4200 },
  },
  {
    id: 'notif_sup_stock_1',
    recipientRole: 'supplier',
    type: 'stock',
    title: 'Low Stock Alert',
    message: 'Ethiopian Full-Grain Leather Briefcase has only 3 units remaining in Bole fulfillment center. Restock soon to prevent order rejections.',
    severity: 'warning',
    link: '/portal/supplier?tab=products',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    metadata: { stockRemaining: 3, productName: 'Leather Briefcase' },
  },
  {
    id: 'notif_sup_dispute_1',
    recipientRole: 'supplier',
    type: 'dispute',
    title: 'Dispute Filed on Order #ORD-8285',
    message: 'Buyer raised a dispute: "Delivery delayed past 24-hr commitment". Central Escrow Arbitration is reviewing payment lock.',
    severity: 'error',
    link: '/portal/supplier?tab=orders',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    metadata: { orderNumber: 'ORD-8285', disputeId: 'disp_001' },
  },
  {
    id: 'notif_agt_escrow_1',
    recipientRole: 'salesperson',
    type: 'wallet',
    title: 'Commissions Ready for Payout',
    message: 'ETB 2,450 in commission escrow cleared following confirmed delivery of Order #ORD-8274. Ready for instant Telebirr/CBE payout.',
    severity: 'success',
    link: '/portal/salesperson?tab=payouts',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    metadata: { amount: 2450 },
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
    metadata: { orderNumber: 'ORD-8291' },
  },
];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Notifications state
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return INITIAL_FALLBACK_SEEDS;
  });

  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  // Sound preference
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const val = localStorage.getItem(SOUND_PREF_KEY);
        if (val !== null) return val === 'true';
      } catch {}
    }
    return true;
  });

  // Modal inspection state
  const [selectedModalNotification, setSelectedModalNotification] = useState<AppNotification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Top-Right Toasts stack
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Ref tracking seen notification IDs so we only alert ONCE per new incoming notification
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const initialMountRef = useRef<boolean>(true);

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
      } catch {}
    }
  }, [allNotifications]);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SOUND_PREF_KEY, String(enabled));
      } catch {}
    }
  };

  // Toast Helpers
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (input: Omit<ToastItem, 'id' | 'createdAt'>): string => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = {
        ...input,
        id,
        createdAt: Date.now(),
        duration: input.duration || 6000,
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep max 5 visible
      return id;
    },
    []
  );

  const toast = useMemo(
    () => ({
      success: (title: string, message: string, options?: ToastOptions) =>
        showToast({ type: 'success', title, message, ...options }),
      error: (title: string, message: string, options?: ToastOptions) =>
        showToast({ type: 'error', title, message, ...options }),
      warning: (title: string, message: string, options?: ToastOptions) =>
        showToast({ type: 'warning', title, message, ...options }),
      message: (title: string, message: string, options?: ToastOptions) =>
        showToast({ type: 'message', title, message, ...options }),
      info: (title: string, message: string, options?: ToastOptions) =>
        showToast({ type: 'info', title, message, ...options }),
    }),
    [showToast]
  );

  // Modal inspection triggers
  const openModal = useCallback((notification: AppNotification) => {
    setSelectedModalNotification(notification);
    setIsModalOpen(true);
  }, []);

  const openModalById = useCallback(
    (id: string) => {
      const found = allNotifications.find((n) => n.id === id);
      if (found) {
        setSelectedModalNotification(found);
        setIsModalOpen(true);
      }
    },
    [allNotifications]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedModalNotification(null);
  }, []);

  // Fetch notifications from database API
  const fetchFromDb = useCallback(async () => {
    try {
      setIsRefetching(true);
      const role = currentUser?.role || 'all';
      const recipientId = currentUser?.businessId || currentUser?.salesPartnerId || undefined;

      const res = await notificationsApi.getAll({ role, recipientId });
      if (res?.success && Array.isArray(res.notifications) && res.notifications.length > 0) {
        const formatted: AppNotification[] = res.notifications.map((n: any) => ({
          id: n.id,
          recipientRole: n.recipientRole,
          recipientId: n.recipientId,
          type: n.type || 'system',
          title: n.title,
          message: n.message,
          severity: n.severity === 'urgent' ? 'urgent' : (n.severity as any) || 'info',
          link: n.link || undefined,
          read: Boolean(n.isRead ?? n.read),
          createdAt: n.createdAt || new Date().toISOString(),
          metadata: n.metadata || undefined,
        }));

        // Detect new incoming notifications for push, audio chime & top-right toast
        if (!initialMountRef.current) {
          const newIncoming = formatted.filter(
            (item) => !seenNotificationIdsRef.current.has(item.id) && !item.read
          );

          if (newIncoming.length > 0) {
            newIncoming.forEach((item) => {
              seenNotificationIdsRef.current.add(item.id);

              // Sound chime
              if (soundEnabled) {
                playNotificationSound(item.severity);
              }

              // Top-Right Toast
              const toastType: ToastType =
                item.severity === 'error' || item.severity === 'urgent'
                  ? 'error'
                  : item.severity === 'warning'
                  ? 'warning'
                  : item.type === 'message'
                  ? 'message'
                  : item.severity === 'success'
                  ? 'success'
                  : 'info';

              showToast({
                type: toastType,
                title: item.title,
                message: item.message,
                link: item.link,
                notificationId: item.id,
                actionLabel: 'Open Tab',
              });

              // Browser push if permitted
              if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'granted'
              ) {
                try {
                  new Notification(item.title, {
                    body: item.message,
                    icon: '/icon-192x192.png',
                    tag: item.id,
                  });
                } catch {}
              }
            });
          }
        } else {
          // Record current IDs on initial mount
          formatted.forEach((n) => seenNotificationIdsRef.current.add(n.id));
          initialMountRef.current = false;
        }

        setAllNotifications(formatted);
      }
    } catch (e) {
      // Keep existing notifications in state on network glitch
    } finally {
      setIsRefetching(false);
    }
  }, [currentUser, soundEnabled, showToast]);

  // Initial fetch and 6-second polling loop to push incoming messages
  useEffect(() => {
    fetchFromDb();
    const interval = setInterval(() => {
      fetchFromDb();
    }, 6000);

    return () => clearInterval(interval);
  }, [fetchFromDb]);

  // Request native browser Push permission
  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.warning('Not Supported', 'Browser push notifications are not supported on this browser.');
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        toast.success(
          'Push Notifications Active',
          'You will receive instant alerts for incoming orders, low stock, and wallet updates.'
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Push new notification to database & trigger real-time alert
  const sendNotification = async (input: SendNotificationInput): Promise<AppNotification | null> => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: AppNotification = {
      id,
      recipientRole: input.recipientRole,
      recipientId: input.recipientId || undefined,
      type: input.type,
      title: input.title,
      message: input.message,
      severity: input.severity,
      link: input.link || undefined,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: input.metadata,
    };

    // Mark as seen so sender does not double-toast
    seenNotificationIdsRef.current.add(id);

    // Optimistically add to state
    setAllNotifications((prev) => [newNotif, ...prev]);

    // Play chime sound
    if (soundEnabled) {
      playNotificationSound(input.severity);
    }

    // Top-right toast
    const toastType: ToastType =
      input.severity === 'error' || input.severity === 'urgent'
        ? 'error'
        : input.severity === 'warning'
        ? 'warning'
        : input.type === 'message'
        ? 'message'
        : input.severity === 'success'
        ? 'success'
        : 'info';

    showToast({
      type: toastType,
      title: input.title,
      message: input.message,
      link: input.link || undefined,
      notificationId: id,
      actionLabel: 'Open Tab',
    });

    // Save to database
    try {
      await notificationsApi.create({
        recipientRole: input.recipientRole,
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        severity: input.severity,
        link: input.link,
        metadata: input.metadata,
      });
    } catch (e) {
      console.warn('[Notification Context] Failed to persist to DB:', e);
    }

    return newNotif;
  };

  // Mark single as read
  const markAsRead = async (id: string) => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await notificationsApi.markAsRead(id);
    } catch {}
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const role = currentUser?.role;
    setAllNotifications((prev) =>
      prev.map((n) => {
        if (!role || role === 'admin' || n.recipientRole === 'all' || n.recipientRole === role) {
          return { ...n, read: true };
        }
        return n;
      })
    );
    try {
      await notificationsApi.markAllAsRead({
        role: role || undefined,
        recipientId: currentUser?.businessId || currentUser?.salesPartnerId || undefined,
      });
    } catch {}
  };

  // Clear single
  const clearNotification = async (id: string) => {
    setAllNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsApi.delete(id);
    } catch {}
  };

  // Clear all
  const clearAll = async () => {
    const role = currentUser?.role;
    setAllNotifications((prev) =>
      prev.filter((n) => {
        if (!role || role === 'admin' || n.recipientRole === 'all' || n.recipientRole === role) {
          return false;
        }
        return true;
      })
    );
    try {
      await notificationsApi.clearAll({
        role: role || undefined,
        recipientId: currentUser?.businessId || currentUser?.salesPartnerId || undefined,
      });
    } catch {}
  };

  // Filtered notifications for current authenticated role
  const userRole = currentUser?.role;
  const filteredNotifications = useMemo(() => {
    if (!userRole || userRole === 'admin') {
      return allNotifications;
    }
    return allNotifications.filter(
      (n) => n.recipientRole === 'all' || n.recipientRole === userRole
    );
  }, [allNotifications, userRole]);

  const unreadCount = useMemo(() => {
    return filteredNotifications.filter((n) => !n.read).length;
  }, [filteredNotifications]);

  const value: NotificationContextType = {
    notifications: filteredNotifications,
    allNotifications,
    unreadCount,
    pushPermission,
    soundEnabled,
    setSoundEnabled,
    selectedModalNotification,
    isModalOpen,
    openModal,
    openModalById,
    closeModal,
    toasts,
    showToast,
    dismissToast,
    toast,
    requestPushPermission,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    refetch: fetchFromDb,
    isRefetching,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Export standalone toast hook for simple consumption in any component
export const useToast = () => {
  const { toast, showToast, dismissToast } = useNotifications();
  return { toast, showToast, dismissToast };
};
