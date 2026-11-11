import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ – Frequently Asked Questions (ተደጋጋሚ ጥያቄዎች)',
  description:
    'Answers to common questions about Azwari (አዝዋሪ): how agents earn commissions, the 15-minute stock confirmation window, and merchant payments.',
  alternates: {
    canonical: './',
  },
};

const faqs = [
  {
    q: 'What is Azwari (አዝዋሪ)?',
    a: 'Azwari (አዝዋሪ) is an Ethiopian commission-based sales marketplace connecting verified merchants with independent freelance sales agents. Merchants list products with set commissions, and agents sell those products via messaging, social channels, or in person without needing their own capital or inventory.',
  },
  {
    q: 'How do sales agents earn commissions?',
    a: 'Agents register for free, browse verified supplier products, and share their unique product links with buyers. When a sale completes and delivery is confirmed, the agent receives their agreed commission (fixed ETB amount or percentage) directly into their balance, withdrawable via Telebirr or bank transfer.',
  },
  {
    q: 'How does the 15-minute stock confirmation work?',
    a: 'To prevent customers from paying for items that may have sold to walk-in retail shoppers, Azwari never requests payment upfront. When an agent places an order, the merchant is prompted to physically check store shelves within a 15-minute window. Only when the merchant confirms stock availability is the customer sent payment details.',
  },
  {
    q: 'How does payment work for customers?',
    a: 'Customers pay the merchant directly (via Telebirr, CBE transfer, or delivery terms agreed with the merchant). Azwari does not hold customer funds. Once delivery is completed and confirmed, the merchant settles the agent’s earned commission.',
  },
  {
    q: 'Is it free to join Azwari as a merchant or sales agent?',
    a: 'Yes, registration is free for both merchants and sales agents. Merchants only pay the agreed commission when a product is actually sold and delivered. There are no monthly fees or listing charges.',
  },
  {
    q: 'Where does Azwari operate and fulfill deliveries?',
    a: 'Azwari serves merchants and sales agents operating throughout Addis Ababa (including Bole, Merkato, Kazanchis, Piassa, Saris, CMC, and Lebu) with direct courier delivery options.',
  },
];

export default function FaqPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Clear, straightforward answers about how Azwari (አዝዋሪ) connects merchants and sales agents.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <details
            key={idx}
            className="group glass-card rounded-2xl p-6 border border-slate-200/90 transition-all [&_summary::-webkit-details-marker]:hidden cursor-pointer"
            open={idx === 0}
          >
            <summary className="flex items-center justify-between font-bold text-sm sm:text-base text-slate-900 list-none">
              <span>{faq.q}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-3" />
            </summary>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-3 pt-3 border-t border-slate-100">
              {faq.a}
            </p>
          </details>
        ))}
      </div>

      <div className="text-center pt-6">
        <Link
          href="/how-it-works"
          className="text-xs font-semibold text-slate-900 underline hover:text-slate-700"
        >
          Read the step-by-step How It Works guide &rarr;
        </Link>
      </div>
    </div>
  );
}

