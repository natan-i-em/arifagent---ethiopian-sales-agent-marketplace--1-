'use client';

import React from 'react';
import Link from 'next/link';
import { AppNotification } from '@/types';
import {
  X,
  Bell,
  ShoppingCart,
  Package,
  CreditCard,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
  Trash2,
  ArrowRight
} from 'lucide-react';

interface NotificationDetailModalProps {
  notification: AppNotification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onDelete,
}) => {
  if (!isOpen || !notification) return null;

  const getIcon = () => {
    const cls = "w-6 h-6";
    switch (notification.type) {
      case 'order':
        return <ShoppingCart className={`${cls} text-blue-400`} />;
      case 'stock':
      case 'inventory':
        return <Package className={`${cls} text-amber-400`} />;
      case 'wallet':
      case 'escrow':
        return <CreditCard className={`${cls} text-emerald-400`} />;
      case 'dispute':
        return <AlertTriangle className={`${cls} text-rose-400`} />;
      case 'message':
        return <MessageSquare className={`${cls} text-indigo-400`} />;
      default:
        return <Bell className={`${cls} text-amber-400`} />;
    }
  };

  const getSeverityBadge = () => {
    switch (notification.severity) {
      case 'urgent':
      case 'error':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            URGENT / ERROR
          </span>
        );
      case 'warning':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            WARNING
          </span>
        );
      case 'success':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            SUCCESS
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            INFO
          </span>
        );
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-800 border border-slate-700/60 shadow-xs">
              {getIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  {notification.type.toUpperCase()} NOTIFICATION
                </span>
                {getSeverityBadge()}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formatTimestamp(notification.createdAt)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
              {notification.title}
            </h3>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
              {notification.message}
            </p>
          </div>

          {/* Metadata Card if present */}
          {notification.metadata && Object.keys(notification.metadata).length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Associated Reference Details
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(notification.metadata).map(([key, val]) => (
                  <div key={key} className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="font-semibold text-slate-200 truncate block mt-0.5">
                      {typeof val === 'number' && key.toLowerCase().includes('amount')
                        ? `ETB ${val.toLocaleString()}`
                        : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role & Status Pill */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Audience: <strong className="text-slate-300 capitalize">{notification.recipientRole}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              {notification.read ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Read
                </span>
              ) : (
                <span className="text-amber-400 font-medium">Unread</span>
              )}
            </span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(notification.id);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-transparent hover:border-rose-800/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            {onMarkAsRead && !notification.read && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark as read</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>

            {notification.link && (
              <Link
                href={notification.link}
                onClick={() => {
                  if (onMarkAsRead) onMarkAsRead(notification.id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
              >
                <span>Open in Tab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
