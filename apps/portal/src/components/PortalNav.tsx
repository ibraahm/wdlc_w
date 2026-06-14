'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/training', label: 'Training' },
  { href: '/resources', label: 'Resources' },
  { href: '/settings', label: 'Settings' },
];

export default function PortalNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className="portal-topbar-nav" aria-label="Primary">
      {LINKS.map((l) => {
        const active = isActive(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`portal-nav-link ${active ? 'is-active' : ''}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
