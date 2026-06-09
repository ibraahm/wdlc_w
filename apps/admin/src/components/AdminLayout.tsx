'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';
import type { AdminUser } from '@/lib/api';

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { heading: string; items: NavItem[] };

// Grouped so the 11 destinations are scannable instead of a flat list.
const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: '◈' }],
  },
  {
    heading: 'Content',
    items: [
      { href: '/pages', label: 'Pages', icon: '◻' },
      { href: '/nav', label: 'Navigation', icon: '≡' },
      { href: '/forms', label: 'Forms', icon: '▤' },
    ],
  },
  {
    heading: 'Agents & Onboarding',
    items: [
      { href: '/applications', label: 'Applications', icon: '✉' },
      { href: '/agent-dd', label: 'Due Diligence', icon: '✔' },
      { href: '/agents', label: 'Agent Locations', icon: '⚲' },
      { href: '/partners', label: 'Partners', icon: '⬡' },
      { href: '/network', label: 'Network Map', icon: '🌍' },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { href: '/settings', label: 'Settings', icon: '◎' },
      { href: '/users', label: 'Users', icon: '◉' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

interface AdminLayoutProps {
  children: React.ReactNode;
  user: AdminUser;
}

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  // Derive the current page title from the active nav item (was always "Admin").
  const current = ALL_ITEMS.find((i) => isActive(i.href));
  const pageTitle = current?.label ?? 'Admin';

  const nav = (
    <nav className="admin-nav" aria-label="Main">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading} className="admin-nav-group">
          <p className="admin-nav-heading">{group.heading}</p>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`admin-nav-link ${isActive(item.href) ? 'is-active' : ''}`}
            >
              <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="admin-layout">
      {/* Desktop sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div>
            <span className="admin-sidebar-brand-name">World Direct Link</span>
            <span className="admin-sidebar-brand-sub">Admin Console</span>
          </div>
        </div>
        {nav}
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-user-role">{user.role}</div>
          <div className="admin-sidebar-user-name">{user.name}</div>
          <div className="admin-sidebar-user-email">{user.email}</div>
        </div>
      </aside>

      {/* Mobile drawer + backdrop */}
      <div
        className={`admin-drawer-backdrop ${drawerOpen ? 'is-open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside className={`admin-drawer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="admin-sidebar-brand">
          <div>
            <span className="admin-sidebar-brand-name">World Direct Link</span>
            <span className="admin-sidebar-brand-sub">Admin Console</span>
          </div>
          <button
            type="button"
            className="admin-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        {nav}
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-user-role">{user.role}</div>
          <div className="admin-sidebar-user-name">{user.name}</div>
        </div>
      </aside>

      {/* Main area */}
      <div className="admin-main-area">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-hamburger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <div className="admin-topbar-title">{pageTitle}</div>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-topbar-user">{user.name}</span>
            <form action={logoutAction}>
              <button type="submit" className="admin-logout-btn">Sign Out</button>
            </form>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
