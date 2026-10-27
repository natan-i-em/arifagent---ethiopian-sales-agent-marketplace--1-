import type { Metadata } from 'next';
import './globals.css';
import { ClientLayout } from '@/components/layout/ClientLayout';

export const metadata: Metadata = {
  title: 'Azwari Ethiopia - Commission-Only Sales Marketplace & Escrow',
  description:
    'Ethiopian multi-party commerce platform connecting verified product owners with independent sales agents across Addis Ababa. Backed by Chapa, Telebirr, and secure escrow.',
  keywords: [
    'Azwari',
    'Ethiopia',
    'Sales Agent',
    'Marketplace',
    'Addis Ababa',
    'Commission Sales',
    'Chapa',
    'Telebirr',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
