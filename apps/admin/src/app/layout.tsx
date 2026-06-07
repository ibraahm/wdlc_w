import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WDLC Admin',
  description: 'World Direct Link Corp — Admin Back-Office',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
