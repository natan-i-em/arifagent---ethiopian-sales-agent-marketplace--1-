import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, ShieldCheck, ShoppingBag, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works (እንዴት እንደሚሰራ)',
  description:
    'Learn how Azwari connects Ethiopian merchants with commission-based sales agents using a 15-minute physical stock verification system.',
  alternates: {
    canonical: './',
  },
};

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <span>Azwari · እንዴት እንደሚሰራ</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          How Azwari (አዝዋሪ) Works
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          A transparent commission marketplace connecting verified Ethiopian suppliers with freelance sales agents.
        </p>
      </div>

      {/* Steps Grid */}
      <div className="space-y-6">
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
              1
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Merchants List Products &amp; Set Commissions (ነጋዴው ዕቃዎችን ያስቀምጣል)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-11">
            Wholesale merchants and retail store owners list their physical products on Azwari, set the retail unit price, and define an attractive sales commission (fixed ETB or percentage) for freelance sales agents. There are no listing fees or upfront salaries.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
              2
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Sales Agents Pick &amp; Promote (አዝዋሪው ያስተዋውቃል)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-11">
            Independent sales agents (አዝዋሪዎች) browse verified listings from Addis Ababa merchants. Agents promote products to their network across Telegram groups, TikTok, WhatsApp, Instagram, or in person, with zero capital or inventory requirements.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-sm">
              3
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              The 15-Minute Shelf-Stock Verification (የ15 ደቂቃ የዕቃ ክምችት ማረጋገጫ)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-11">
            When a buyer expresses interest, the merchant is alerted via Telegram and the web dashboard to physically verify that the item is on the shelf within a <strong>15-minute countdown window</strong>. This guarantees that walk-in retail sales do not lead to out-of-stock customer payments.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
              4
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Direct Payment &amp; Delivery (ክፍያ እና ርክክብ)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-11">
            Once stock is confirmed, the customer pays the merchant directly via Telebirr or CBE bank transfer. Azwari does not hold customer funds. The merchant packages and dispatches the item for local delivery in Addis Ababa.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
              5
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Commission Payout to Agent (የኮሚሽን ክፍያ)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-11">
            Upon verified delivery, the merchant settles the sales agent&apos;s earned commission, which is credited to the agent&apos;s balance and can be transferred to Telebirr or a bank account.
          </p>
        </div>
      </div>

      <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
        <Link
          href="/signup"
          className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors flex items-center gap-2"
        >
          <span>Get Started Free</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/faq"
          className="px-6 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors"
        >
          <span>Read FAQ</span>
        </Link>
      </div>
    </div>
  );
}

