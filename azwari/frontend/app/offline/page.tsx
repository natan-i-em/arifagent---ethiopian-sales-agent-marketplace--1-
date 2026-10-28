'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-md mx-auto w-full pt-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm border border-slate-800 shadow-sm">
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white block leading-none">
              Azwari
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Offline Mode</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline</span>
        </div>
      </div>

      {/* Center Body */}
      <div className="max-w-md mx-auto w-full text-center py-12 flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 shadow-2xl relative">
          <WifiOff className="w-10 h-10 text-amber-400" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-950 border-2 border-slate-900 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">
          Connection Interrupted
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-xs">
          Unable to reach the Azwari marketplace. Please check your Ethio Telecom data, Telebirr connection, or Wi-Fi network.
        </p>

        <div className="w-full space-y-3">
          <button
            onClick={handleReload}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Reconnecting</span>
          </button>

          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors border border-slate-800 block text-center"
          >
            Return to Cached Home
          </Link>
        </div>
      </div>

      {/* Footer Escrow Guarantee Notice */}
      <div className="max-w-md mx-auto w-full pb-4">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-normal">
            Your transactions and escrow balances remain secure. Azwari will automatically sync as soon as network connectivity is restored.
          </p>
        </div>
      </div>
    </div>
  );
}
