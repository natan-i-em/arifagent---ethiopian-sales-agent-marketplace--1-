import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Layers, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Azwari (ስለ አዝዋሪ)',
  description:
    'Azwari (አዝዋሪ) connects verified Ethiopian merchants with independent sales agents, creating sales opportunities with zero upfront capital.',
  alternates: {
    canonical: './',
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <Layers className="w-3.5 h-3.5 text-slate-700" />
          <span>ስለ አዝዋሪ · About Azwari</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Empowering Ethiopian Commerce &amp; Independent Sales
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Azwari (አዝዋሪ) bridges traditional retail merchants with energetic freelance sales agents across Ethiopia.
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
        <div className="glass-card rounded-3xl p-8 border border-slate-200/90 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            Why the name &ldquo;Azwari&rdquo; (አዝዋሪ)?
          </h2>
          <p>
            In Ethiopian commerce, an <strong>አዝዋሪ</strong> (Azwari) has traditionally referred to the mobile, hardworking seller who circulates goods from market stalls to where customers are.
          </p>
          <p>
            We built <strong>Azwari</strong> to give that spirit modern digital tools: connecting physical inventory holders (suppliers in Merkato, Bole, and across Addis Ababa) with independent individuals who have the social reach and sales skills to sell goods online and offline.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-slate-200/90 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            Our Core Principles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <h3 className="font-bold text-slate-900 text-sm">Truthful Stock Verification</h3>
              <p className="text-xs text-slate-500">
                A 15-minute physical confirmation window ensures customers only pay for items that are verified on the shelf.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <h3 className="font-bold text-slate-900 text-sm">Transparent Commissions</h3>
              <p className="text-xs text-slate-500">
                Merchants define fair commissions upfront; agents always know exactly what they will earn before sharing a product.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <h3 className="font-bold text-slate-900 text-sm">Direct Commercial Trust</h3>
              <p className="text-xs text-slate-500">
                Customers settle directly with merchants, keeping payment rails simple and direct through Telebirr and bank transfer.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <h3 className="font-bold text-slate-900 text-sm">Opportunity for All</h3>
              <p className="text-xs text-slate-500">
                No initial capital required to start. Anyone with motivation and sales ability can build a flexible income stream.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/how-it-works"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors"
        >
          <span>See How It Works</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

