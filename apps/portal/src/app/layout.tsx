import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import VisitBeacon from '@/components/VisitBeacon';

export const metadata: Metadata = {
  title: 'World Direct Link Agent Portal',
  description: 'Secure compliance portal for World Direct Link agents',
  robots: { index: false, follow: false },
};

// Languages written right-to-left; drives the <html dir> attribute.
const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Mirrored from the agent's saved preference (see setLanguageAction) so the
  // document language/direction are correct before any client JS runs.
  const lang = cookies().get('plang')?.value || 'en';
  const dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
  return (
    <html lang={lang} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <VisitBeacon />
      </body>
    </html>
  );
}
