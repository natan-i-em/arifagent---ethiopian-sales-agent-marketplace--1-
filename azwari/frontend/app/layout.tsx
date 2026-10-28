import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

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
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Azwari',
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        <ServiceWorkerRegister />
        <ClientLayout>{children}</ClientLayout>
        <InstallPrompt />
      </body>
    </html>
  );
}
