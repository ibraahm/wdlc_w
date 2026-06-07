import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import './globals.css';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import RecaptchaProvider from '@/components/RecaptchaProvider';
import DesignEffects from '@/components/DesignEffects';
import { company } from '@/lib/site';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

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
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
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
