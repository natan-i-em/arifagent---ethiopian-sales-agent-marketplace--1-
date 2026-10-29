'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ToastItem, ToastType } from '@/types/toast';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  MessageSquare,
  X,
  ExternalLink,
  Eye
} from 'lucide-react';

interface TopRightToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onOpenNotificationModal?: (notificationId: string) => void;
}

export const TopRightToastContainer: React.FC<TopRightToastContainerProps> = ({
  toasts,
  onDismiss,
  onOpenNotificationModal,
}) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notification Toasts"
      className="fixed top-4 right-4 z-[99999] pointer-events-none flex flex-col gap-2.5 max-w-sm sm:w-96 w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => (
        <SingleToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onOpenModal={onOpenNotificationModal}
        />
      ))}
    </div>
  );
};

const SingleToastItem: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
  onOpenModal?: (notificationId: string) => void;
}> = ({ toast, onDismiss, onOpenModal }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 6000;

  useEffect(() => {
    if (isPaused) return;

    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss(toast.id);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, duration, toast.id, onDismiss]);

  const getStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          border: 'border-emerald-500/40',
          bg: 'bg-slate-900/95',
          glow: 'shadow-[0_8px_30px_rgb(16,185,129,0.12)]',
          badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          progressBar: 'bg-emerald-500',
          badgeText: 'SUCCESS',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          border: 'border-rose-500/40',
          bg: 'bg-slate-900/95',
          glow: 'shadow-[0_8px_30px_rgb(244,63,94,0.15)]',
          badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          progressBar: 'bg-rose-500',
          badgeText: 'ERROR',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          border: 'border-amber-500/40',
          bg: 'bg-slate-900/95',
          glow: 'shadow-[0_8px_30px_rgb(245,158,11,0.12)]',
          badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          progressBar: 'bg-amber-500',
          badgeText: 'WARNING',
        };
      case 'message':
        return {
          icon: <MessageSquare className="w-5 h-5 text-indigo-400 shrink-0" />,
          border: 'border-indigo-500/40',
          bg: 'bg-slate-900/95',
          glow: 'shadow-[0_8px_30px_rgb(99,102,241,0.15)]',
          badgeBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
          progressBar: 'bg-indigo-500',
          badgeText: 'INCOMING MESSAGE',
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
          border: 'border-blue-500/40',
          bg: 'bg-slate-900/95',
          glow: 'shadow-[0_8px_30px_rgb(59,130,246,0.12)]',
          badgeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          progressBar: 'bg-blue-500',
          badgeText: 'INFO',
        };
    }
  };

  const style = getStyle(toast.type);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto rounded-2xl ${style.bg} ${style.border} ${style.glow} border backdrop-blur-xl text-white shadow-2xl overflow-hidden transition-all duration-300 transform translate-x-0 opacity-100 flex flex-col`}
      role="alert"
    >
      <div className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 mt-0.5">
          {style.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${style.badgeBg}`}
              >
                {style.badgeText}
              </span>
              <h4 className="font-bold text-xs text-white truncate leading-tight">
                {toast.title}
              </h4>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
            {toast.message}
          </p>

          <div className="mt-2.5 flex items-center justify-end gap-2">
            {toast.notificationId && onOpenModal && (
              <button
                onClick={() => {
                  onOpenModal(toast.notificationId!);
                  onDismiss(toast.id);
                }}
                className="text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors border border-slate-700/60"
              >
                <Eye className="w-3 h-3 text-amber-400" />
                <span>View Modal</span>
              </button>
            )}

            {toast.link && (
              <Link
                href={toast.link}
                onClick={() => onDismiss(toast.id)}
                className="text-[10px] font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>{toast.actionLabel || 'Open Tab'}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}

            {toast.onAction && !toast.link && (
              <button
                onClick={() => {
                  toast.onAction!();
                  onDismiss(toast.id);
                }}
                className="text-[10px] font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>{toast.actionLabel || 'Open'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress countdown bar */}
      <div className="w-full h-1 bg-slate-800/80">
        <div
          className={`h-full ${style.progressBar} transition-all duration-75`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
