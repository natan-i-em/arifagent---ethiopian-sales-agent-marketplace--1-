import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, ShieldCheck, TrendingUp, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Merchants (ለንግድ ቤቶች)',
  description:
    'Grow your sales with hundreds of independent sales agents in Addis Ababa. Pay only when products sell, with built-in 15-minute stock confirmation.',
  alternates: {
    canonical: './',
  },
};

export default function ForMerchantsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Scale Your Sales Without Fixed Payroll
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          List your inventory and let motivated independent sales agents sell for you across Addis Ababa. Pay commissions only on successful sales.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            A Distributed Sales Force
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Gain immediate reach through active sales agents marketing your products on TikTok, Telegram channels, Instagram, and local retail networks.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            15-Minute Shelf Stock Control
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            When an agent enters an order, you have 15 minutes to verify shelf stock before the buyer is sent payment details. Never face out-of-stock complaints again.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Performance-Based Growth
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            No fixed monthly retainers or upfront marketing spend. You decide the commission per item sold, keeping margins completely in your control.
          </p>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-8 border border-slate-200/90 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          How to Get Started as a Merchant
        </h2>
        <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <span>Create a free merchant account on Azwari (አዝዋሪ).</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <span>Upload product photos, wholesale retail prices, and commission rates.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <span>Confirm shelf stock availability via the dashboard or Telegram bot when orders arrive.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <span>Fulfill orders and settle agent commissions upon delivery.</span>
          </li>
        </ul>
        <div className="pt-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <span>List Your Products Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

