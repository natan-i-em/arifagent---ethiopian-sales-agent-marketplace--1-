import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageSquare, PhoneCall } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us (ያግኙን)',
  description:
    'Get in touch with the Azwari team for merchant onboarding, sales agent support, or partnership inquiries.',
  alternates: {
    canonical: './',
  },
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <span>ያግኙን · Contact</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          We&apos;re Here to Help
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          Questions about listing products as a merchant, joining as a sales agent, or needing assistance? Reach out to us.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            For Merchants &amp; Wholesalers
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Want to list products in bulk or need assistance setting up your merchant account?
          </p>
          <div className="pt-2">
            <Link
              href="/signup"
              className="text-xs font-semibold text-slate-900 underline hover:text-slate-700"
            >
              Register as a Merchant &rarr;
            </Link>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <PhoneCall className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            For Sales Agents
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Need guidance on picking top-selling products, tracking commissions, or payout questions?
          </p>
          <div className="pt-2">
            <Link
              href="/for-agents"
              className="text-xs font-semibold text-slate-900 underline hover:text-slate-700"
            >
              Sales Agent Guide &rarr;
            </Link>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-8 border border-slate-200/90 text-center space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
          Most common questions regarding stock confirmation, commissions, and order fulfillment are answered in our knowledge base.
        </p>
        <div className="pt-2">
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <span>Visit FAQ Page</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

