import type { Metadata } from 'next';
import './globals.css';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import { getSettings } from '@/lib/api';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  const siteInfo = (settings['site'] as Record<string, string> | undefined) ?? {};
  const siteName =
    (settings['siteName'] as string | undefined) ??
    siteInfo['siteName'] ??
    'World Direct Link, Corp.';
  const tagline =
    (settings['tagline'] as string | undefined) ??
    siteInfo['tagline'] ??
    'Global connectivity solutions for modern business';
  const seoDescription =
    (settings['seoDescription'] as string | undefined) ??
    siteInfo['seoDescription'] ??
    tagline;

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: seoDescription,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    openGraph: {
      siteName,
      type: 'website',
    },
  };
}

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
