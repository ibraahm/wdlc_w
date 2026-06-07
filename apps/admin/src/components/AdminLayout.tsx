'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';
import type { AdminUser } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/pages', label: 'Pages', icon: '⊡' },
  { href: '/nav', label: 'Navigation', icon: '≡' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
  { href: '/users', label: 'Users', icon: '⊕' },
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
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 flex-shrink-0"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-white/10">
          <span className="text-white font-bold text-xl tracking-tight">WDLC Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-white/50 text-xs mb-1">{user.role}</div>
          <div className="text-white text-sm font-medium truncate">{user.name}</div>
          <div className="text-white/50 text-xs truncate">{user.email}</div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile menu placeholder */}
            <span className="md:hidden text-gray-500 text-sm font-medium">WDLC Admin</span>
            {title && (
              <h1 className="text-lg font-semibold text-gray-900 hidden md:block">{title}</h1>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">{user.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-red-600 px-3 py-1.5 rounded border border-gray-200 hover:border-red-300 transition-colors"
              >
                Logout
              </button>
            </form>
          </div>
        </header>

        {/* Mobile nav (simple top bar) */}
        <nav className="md:hidden bg-white border-b border-gray-200 flex overflow-x-auto px-2 py-1 gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Page title on mobile */}
        {title && (
          <div className="md:hidden px-4 py-3 bg-white border-b border-gray-100">
            <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
