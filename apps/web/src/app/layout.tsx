import type { Metadata } from 'next';
import './globals.css';
import dynamic from 'next/dynamic';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import RecaptchaProvider from '@/components/RecaptchaProvider';
import { company } from '@/lib/site';

const DesignEffects = dynamic(() => import('@/components/DesignEffects'), { ssr: false });

export const metadata: Metadata = {
  title: {
    default: `${company.legalName} — ${company.tagline}`,
    template: `%s | ${company.shortName}`,
  },
  description:
    'World Direct Link, Corp. is a licensed money transmitter serving immigrant, refugee, and diaspora families with fast, affordable, and reliable money transfers since 1999.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: { siteName: company.legalName, type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="progress" id="progress" />
        <div className="cursor-dot" aria-hidden="true" />
        <div className="cursor-ring" aria-hidden="true" />
        <RecaptchaProvider>
          <SiteNav />
          {children}
          <Footer />
        </RecaptchaProvider>
        <DesignEffects />
      </body>
    </html>
  );
}
