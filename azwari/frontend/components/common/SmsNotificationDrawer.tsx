'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { MessageSquareText, ExternalLink, X, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';

export const SmsNotificationDrawer: React.FC = () => {
  const { recentSmsAlert, dismissSmsAlert, setActiveRole, setSelectedCustomerToken, orders } = useApp();

  if (!recentSmsAlert) return null;

  const relatedOrder = orders.find((o) => o.orderNumber === recentSmsAlert.orderNumber);
  const isFailed = recentSmsAlert.status === 'failed';
  const isSimulated = Boolean(recentSmsAlert.isSimulated);

  const handleOpenBuyerOrder = () => {
    if (relatedOrder) {
      setSelectedCustomerToken(relatedOrder.publicAccessToken);
      setActiveRole('customer');
      dismissSmsAlert();
    }
  };

  return (
    <aside
      aria-label="SMS Notification"
      className={`fixed bottom-5 right-5 z-50 max-w-md w-full bg-slate-900/95 text-white rounded-2xl shadow-2xl border ${
        isFailed ? 'border-rose-500/50' : 'border-slate-700/80'
      } p-4 backdrop-blur-xl animate-in slide-in-from-bottom duration-200`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
              isFailed
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : isSimulated
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {isFailed ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : isSimulated ? (
              <Radio className="w-4 h-4 text-amber-300" />
            ) : (
              <MessageSquareText className="w-4 h-4 text-emerald-300" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>
                {isFailed
                  ? 'SMS Gateway Notice (Delivery Blocked)'
                  : isSimulated
                  ? 'Simulated SMS Dispatch'
                  : 'Live SMS Dispatched'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {recentSmsAlert.provider} · <span className="font-mono text-slate-300">{recentSmsAlert.recipientPhone}</span>
            </div>
          </div>
        </div>
        <button
          onClick={dismissSmsAlert}
          className="text-slate-400 hover:text-white transition-colors p-1"
          aria-label="Dismiss SMS alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs font-mono text-slate-200 leading-relaxed mb-3">
        "{recentSmsAlert.messageBody}"
      </div>

      {isFailed && recentSmsAlert.error && (
        <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-[11px] text-rose-200">
          <div className="font-semibold text-rose-300 mb-0.5">Gateway Response:</div>
          <div className="font-mono leading-relaxed opacity-90">{recentSmsAlert.error}</div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
          {isFailed ? (
            <span className="text-rose-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Failed to reach carrier ({recentSmsAlert.providerRef})
            </span>
          ) : isSimulated ? (
            <span className="text-amber-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Development Simulation ({recentSmsAlert.providerRef})
            </span>
          ) : (
            <span className="text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Handset Delivery Verified ({recentSmsAlert.providerRef})
            </span>
          )}
        </div>

        {relatedOrder && (
          <button
            onClick={handleOpenBuyerOrder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <span>Open as Buyer</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </aside>
  );
};
