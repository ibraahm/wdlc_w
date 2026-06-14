'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';

type Agent = { firstName: string; lastName: string; email: string };

const NAV: { href: string; label: string; icon: JSX.Element }[] = [
  {
    href: '/dashboard', label: 'Dashboard',
    icon: (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>),
  },
  {
    href: '/training', label: 'Training',
    icon: (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 2 6 2s6-1 6-2v-5"/></svg>),
  },
  {
    href: '/resources', label: 'Resources',
    icon: (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>),
  },
  {
    href: '/settings', label: 'Settings',
    icon: (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
  },
];

export default function PortalShell({ agent, children }: { agent: Agent; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  // Close the mobile drawer on navigation and on Escape.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nav = (
    <nav className="pshell-nav" aria-label="Primary">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? 'page' : undefined}
          className={`pshell-link ${isActive(item.href) ? 'is-active' : ''}`}
        >
          <span className="pshell-link-icon" aria-hidden>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  const userBlock = (
    <div className="pshell-user">
      <div className="pshell-user-avatar" aria-hidden>{agent.firstName?.[0]}{agent.lastName?.[0]}</div>
      <div className="pshell-user-meta">
        <div className="pshell-user-name">{agent.firstName} {agent.lastName}</div>
        <div className="pshell-user-email" title={agent.email}>{agent.email}</div>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="pshell-logout" aria-label="Sign out">Sign Out</button>
      </form>
    </div>
  );

  return (
    <div className="pshell">
      <a href="#portal-main" className="portal-skip-link">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="pshell-sidebar" aria-label="Sidebar">
        <Link href="/dashboard" className="pshell-brand" aria-label="World Direct Link Agent Portal — home">
          World Direct Link
          <span>Agent Portal</span>
        </Link>
        {nav}
        {userBlock}
      </aside>

      {/* Mobile top bar */}
      <header className="pshell-mobilebar">
        <button className="pshell-hamburger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <Link href="/dashboard" className="pshell-brand pshell-brand-mobile">
          World Direct Link<span>Agent Portal</span>
        </Link>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="pshell-backdrop" onClick={() => setOpen(false)} aria-hidden />
          <aside className="pshell-drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="pshell-drawer-top">
              <Link href="/dashboard" className="pshell-brand">World Direct Link<span>Agent Portal</span></Link>
              <button className="pshell-drawer-close" aria-label="Close menu" onClick={() => setOpen(false)}>✕</button>
            </div>
            {nav}
            {userBlock}
          </aside>
        </>
      )}

      <main id="portal-main" className="pshell-main">{children}</main>
    </div>
  );
}
