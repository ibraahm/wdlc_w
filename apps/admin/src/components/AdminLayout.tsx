'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';
import type { AdminUser } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/pages', label: 'Pages', icon: '◻' },
  { href: '/agents', label: 'Agent Locations', icon: '⚲' },
  { href: '/partners', label: 'Partners', icon: '⬡' },
  { href: '/network', label: 'Network Map', icon: '🌍' },
  { href: '/applications', label: 'Applications', icon: '✉' },
  { href: '/agent-dd', label: 'Agent Due Diligence', icon: '✔' },
  { href: '/forms', label: 'Forms', icon: '▤' },
  { href: '/nav', label: 'Navigation', icon: '≡' },
  { href: '/settings', label: 'Settings', icon: '◎' },
  { href: '/users', label: 'Users', icon: '◉' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  user: AdminUser;
  title?: string;
}

export default function AdminLayout({ children, user, title }: AdminLayoutProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div>
            <span className="admin-sidebar-brand-name">World Direct Link</span>
            <span className="admin-sidebar-brand-sub">Admin Console</span>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-link ${isActive(item.href) ? 'is-active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-user">
          <div className="admin-sidebar-user-role">{user.role}</div>
          <div className="admin-sidebar-user-name">{user.name}</div>
          <div className="admin-sidebar-user-email">{user.email}</div>
        </div>
      </aside>

      {/* Main area */}
      <div className="admin-main-area">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-title">{title ?? 'Admin'}</div>
          <div className="admin-topbar-right">
            <span className="admin-topbar-user">{user.name}</span>
            <form action={logoutAction}>
              <button type="submit" className="admin-logout-btn">Sign Out</button>
            </form>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="admin-mobile-nav" style={{ display: 'none' }} aria-label="Mobile navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={isActive(item.href) ? 'is-active' : ''}>
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
