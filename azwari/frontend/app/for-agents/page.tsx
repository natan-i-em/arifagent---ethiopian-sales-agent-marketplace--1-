import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Coins, Share2, Smartphone, UserCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Sales Agents (ለአዝዋሪዎች)',
  description:
    'Start selling products from verified Ethiopian merchants with zero starting capital. Share links, close deals, and earn commissions.',
  alternates: {
    canonical: './',
  },
};

export default function ForAgentsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <UserCheck className="w-3.5 h-3.5 text-slate-700" />
          <span>Azwari · ለሽያጭ ወኪሎች (አዝዋሪዎች)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Earn by Selling Without Buying Inventory
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Pick products from verified merchants in Addis Ababa, share them on your social channels, and earn transparent per-sale commissions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Zero Starting Capital
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            You don&apos;t need to purchase inventory or rent shop space. You sell products already stocked by verified suppliers.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Sell Across Any Channel
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Market products on your Telegram channels, TikTok, Facebook, Instagram, WhatsApp status, or directly to friends and family.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Clear Commission Terms
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Every product displays the exact commission up front. When an order completes, your earnings are credited directly to your balance.
          </p>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-8 border border-slate-200/90 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          How to Start Earning Today
        </h2>
        <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Sign up as a sales agent (አዝዋሪ) on Azwari.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Browse the product catalog and choose products you want to market.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Generate links or place orders on behalf of your customers.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>The merchant confirms stock in 15 minutes, fulfills the package, and your commission is credited.</span>
          </li>
        </ul>
        <div className="pt-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <span>Start Selling as an Agent</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

