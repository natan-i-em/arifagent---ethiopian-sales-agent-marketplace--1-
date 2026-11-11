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

const BASE_URL = 'https://azwari.com.et';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Azwari (አዝዋሪ) – Sell for Commission in Ethiopia',
    template: '%s | Azwari (አዝዋሪ)',
  },
  description:
    'Commission-based sales marketplace connecting Ethiopian merchants with independent sales agents. Sell products with 15-minute stock confirmation and direct commission payouts.',
  applicationName: 'Azwari (አዝዋሪ)',
  alternates: {
    canonical: './',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['am_ET'],
    url: BASE_URL,
    siteName: 'Azwari (አዝዋሪ)',
    title: 'Azwari (አዝዋሪ) – Sell for Commission in Ethiopia',
    description:
      'Commission-based sales marketplace connecting Ethiopian merchants with independent sales agents across Addis Ababa.',
    images: [
      {
        url: '/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Azwari (አዝዋሪ) Ethiopia Marketplace Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Azwari (አዝዋሪ) – Sell for Commission in Ethiopia',
    description:
      'Commission-based sales marketplace connecting Ethiopian merchants with independent sales agents.',
    images: ['/icon-512x512.png'],
  },
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

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${BASE_URL}/#organization`,
  name: 'Azwari',
  alternateName: ['አዝዋሪ', 'azwari.com.et'],
  url: BASE_URL,
  logo: `${BASE_URL}/icon-512x512.png`,
  description:
    'Commission-based sales marketplace connecting Ethiopian merchants with independent sales agents.',
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${BASE_URL}/#website`,
  url: BASE_URL,
  name: 'Azwari',
  alternateName: 'አዝዋሪ',
  publisher: {
    '@id': `${BASE_URL}/#organization`,
  },
  inLanguage: ['en', 'am'],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema, websiteSchema]),
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        <ServiceWorkerRegister />
        <ClientLayout>{children}</ClientLayout>
        <InstallPrompt />
      </body>
    </html>
  );
}
