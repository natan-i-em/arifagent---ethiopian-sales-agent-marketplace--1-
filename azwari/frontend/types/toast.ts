export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'message';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  link?: string;
  notificationId?: string;
  duration?: number; // ms, default 6000
  createdAt: number;
}
