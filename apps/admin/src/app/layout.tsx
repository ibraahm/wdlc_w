import type { Metadata } from 'next';
import './globals.css';
import VisitBeacon from '@/components/VisitBeacon';

export const metadata: Metadata = {
  title: 'World Direct Link Admin',
  description: 'World Direct Link Corp - Admin Back-Office',
  robots: { index: false, follow: false },
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
        {children}
        <VisitBeacon />
      </body>
    </html>
  );
}
