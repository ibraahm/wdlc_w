import type { Metadata } from 'next';
import './globals.css';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import { company } from '@/lib/site';

export const metadata: Metadata = {
  title: {
    default: `${company.legalName} — ${company.tagline}`,
    template: `%s | ${company.shortName}`,
  },
  description:
    'World Direct Link, Corp. is a licensed money transmitter serving immigrant, refugee, and diaspora families with fast, affordable, and reliable money transfers since 1999.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    siteName: company.legalName,
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex flex-col min-h-full">
        <SiteNav />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
