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
    default: 'Azwari | Ethiopian Sales Agent Marketplace & Escrow',
    template: '%s | Azwari Ethiopia',
  },
  description:
    'Ethiopia’s premier multi-party sales agent marketplace connecting verified product suppliers in Addis Ababa with commission-only sales agents. Backed by Telebirr, CBE, and secure escrow.',
  applicationName: 'Azwari',
  keywords: [
    'Azwari',
    'Azwari Ethiopia',
    'azwari.com.et',
    'Ethiopian Sales Agent',
    'Sales Marketplace Ethiopia',
    'Addis Ababa Wholesalers',
    'Commission Sales Addis Ababa',
    'Telebirr Escrow',
    'CBE Bank Transfer',
    'Merkato Wholesale',
    'Bole Commerce',
    'Ethiopian Ecommerce',
    'Freelance Sales Ethiopia',
    'Dropshipping Ethiopia',
    'Agent Network Ethiopia',
  ],
  authors: [{ name: 'Azwari Technologies', url: BASE_URL }],
  creator: 'Azwari Technologies',
  publisher: 'Azwari Technologies',
  alternates: {
    canonical: BASE_URL,
    languages: {
      'en-US': BASE_URL,
      'am-ET': BASE_URL,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['am_ET'],
    url: BASE_URL,
    siteName: 'Azwari',
    title: 'Azwari | Ethiopian Sales Agent Marketplace & Escrow',
    description:
      'Connect with verified suppliers across Addis Ababa. Sell products on commission without buying inventory. Secure payment escrow with Telebirr and CBE.',
    images: [
      {
        url: '/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Azwari Ethiopia - Commission Sales Agent Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Azwari | Ethiopian Sales Agent Marketplace & Escrow',
    description:
      'Ethiopian multi-party commerce platform connecting verified product owners with independent sales agents across Addis Ababa.',
    images: ['/icon-512x512.png'],
    creator: '@azwari_et',
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLdData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Azwari Technologies',
    alternateName: ['Azwari', 'Azwari Ethiopia', 'azwari.com.et'],
    url: BASE_URL,
    logo: `${BASE_URL}/icon-512x512.png`,
    description:
      'Ethiopia’s premier multi-party sales agent marketplace connecting verified product suppliers and wholesalers with independent commission-based sales agents across Addis Ababa.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Addis Ababa',
      addressRegion: 'Addis Ababa',
      addressCountry: 'ET',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@azwari.com.et',
      contactType: 'customer support',
      areaServed: 'ET',
      availableLanguage: ['English', 'Amharic'],
    },
    sameAs: [
      'https://t.me/azwari',
      'https://tiktok.com/@azwari.et',
      'https://www.linkedin.com/company/azwari',
      'https://twitter.com/azwari_et',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'Azwari',
    alternateName: 'Azwari Ethiopia',
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
    inLanguage: ['en', 'am'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${BASE_URL}/#app`,
    name: 'Azwari Marketplace',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All modern browsers (Web, Progressive Web App)',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ETB',
    },
    description:
      'Commission-based sales marketplace and escrow platform enabling independent agents to sell wholesale goods across Addis Ababa with zero capital.',
    featureList: [
      'Commission-only sales agent marketplace',
      '15-minute in-store stock availability reservation',
      'Telebirr and Commercial Bank of Ethiopia (CBE) manual transfer escrow',
      'Automated agent commission tracking and payouts',
      'Addis Ababa local fulfillment',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Azwari?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Azwari (https://azwari.com.et) is Ethiopia’s premier multi-party sales agent marketplace and escrow platform. It connects verified wholesale suppliers in Addis Ababa with independent freelance sales agents who sell products for guaranteed commissions without needing upfront capital or inventory.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do sales agents make money on Azwari?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sales agents choose products listed by verified merchants, share listings on Telegram, TikTok, WhatsApp, or in person, and earn a set commission (fixed ETB or percentage) on every fulfilled order. Payouts are transferred directly to Telebirr or CBE bank accounts once the customer verifies delivery.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does Azwari guarantee physical stock before customer payment?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'When an agent submits an order, Azwari sends an instant alert to the merchant via Telegram Bot and Web. The merchant has 15 minutes to physically confirm store inventory. Only when stock is verified does the customer receive a secure payment link, preventing out-of-stock payment issues.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does Azwari escrow protect buyers and sellers?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Customer payments (via Telebirr, CBE, or Chapa) are held safely in escrow. Funds are only disbursed to the merchant and sales agent after the customer receives the product and confirms inspection with a secure delivery PIN.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where does Azwari operate in Ethiopia?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Azwari is based in Addis Ababa, Ethiopia, operating across all sub-cities including Bole, Merkato, Piassa, Kazanchis, and Saris, with nationwide expansion.',
        },
      },
    ],
  },
];

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
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
