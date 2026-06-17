'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';
import type { AdminUser } from '@/lib/api';
import GlobalSearch from './GlobalSearch';

type NavItem = { href: string; label: string; description: string };
type NavGroup = { heading: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', description: 'Attention queue and recent activity' },
      { href: '/analytics', label: 'Visitor Analytics', description: 'Web, portal, and admin traffic by country' },
    ],
  },
  {
    heading: 'Content',
    items: [
      { href: '/news', label: 'News & Press', description: 'Newsroom and press release content' },
      { href: '/submissions', label: 'Submissions', description: 'Public website form inbox' },
    ],
  },
  {
    heading: 'Agents & Onboarding',
    items: [
      { href: '/applications', label: 'Applications', description: 'Review new agent leads' },
      { href: '/agent-dd', label: 'Due Diligence', description: 'Compliance files and review dates' },
      { href: '/branches', label: 'Active Agents', description: 'Live branches and their portal users' },
      { href: '/regional-offices', label: 'Regional Offices', description: 'Offices, their states, and assigned agents' },
      { href: '/requests', label: 'Agent Requests', description: 'Risk assessments, location DD, and photo submissions' },
      { href: '/tellers', label: 'Teller Applications', description: 'Branch employee applications and credentialing' },
      { href: '/agents', label: 'Agent Locations', description: 'Published public map locations' },
      { href: '/partners', label: 'Partners', description: 'Correspondent and partner network' },
      { href: '/network', label: 'Network Map', description: 'Country payout coverage and methods' },
    ],
  },
  {
    heading: 'Training',
    items: [
      { href: '/training/courses', label: 'Courses', description: 'Course and quiz management' },
      { href: '/training/assignments', label: 'Assignments', description: 'Assign required training with reason and deadline' },
      { href: '/training/compliance', label: 'Compliance', description: 'Completion posture and evidence export' },
      { href: '/training/exceptions', label: 'Exceptions', description: 'Waivers, extensions and equivalencies' },
      { href: '/training/resources', label: 'Resources', description: 'Reference documents for agents' },
      { href: '/training/reports', label: 'Reports', description: 'Score tracking and completion audit' },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { href: '/navigation', label: 'Navigation', description: 'Header, utility, and footer menus' },
      { href: '/settings', label: 'Settings', description: 'Site settings and operational defaults' },
      { href: '/users', label: 'Users', description: 'Admin users and access state' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// Public website URL. Prefer the build-time env; otherwise derive it from the
// current host at runtime (strip a leading admin./secure./portal./www. label →
// the apex domain) so it never points at localhost in production.
function publicSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_WEB_URL) return process.env.NEXT_PUBLIC_WEB_URL;
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const parts = hostname.split('.');
    const apex = parts.length > 2 ? parts.slice(1).join('.') : hostname;
    const isLocal = hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    return isLocal ? `${protocol}//${hostname}${port ? `:${port}` : ''}` : `${protocol}//${apex}`;
  }
  return '';
}

interface AdminLayoutProps {
  children: React.ReactNode;
  user: AdminUser;
}

function normalizeRole(role: string) {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Regional officers get a reduced, region-scoped menu.
const OFFICER_HREFS = new Set(['/dashboard', '/applications', '/agent-dd', '/requests', '/training/reports', '/change-password']);

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Resolve the public-site URL after mount (uses window when no env is set).
  const [siteUrl, setSiteUrl] = useState(process.env.NEXT_PUBLIC_WEB_URL || '');
  useEffect(() => { setSiteUrl(publicSiteUrl()); }, []);

  const navGroups: NavGroup[] = user.role === 'REGIONAL_OFFICER'
    ? NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => OFFICER_HREFS.has(i.href)) })).filter((g) => g.items.length > 0)
    : NAV_GROUPS;

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const current = ALL_ITEMS.find((i) => isActive(i.href));
  const pageTitle = current?.label ?? 'Admin';
  const pageDescription = current?.description ?? 'Manage World Direct Link operations.';

  const crumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((seg, i) => {
      const href = '/' + segments.slice(0, i + 1).join('/');
      const navLabel = ALL_ITEMS.find((it) => it.href === href)?.label;
      const label =
        navLabel ??
        (seg === 'new'
          ? 'New'
          : seg.length > 24
            ? seg.slice(0, 21) + '...'
            : seg.replace(/-/g, ' '));
      return { href, label, last: i === segments.length - 1 };
    });
  }, [pathname]);

  const renderNav = () => (
    <nav className="admin-nav" aria-label="Main navigation">
      {navGroups.map((group) => (
        <div key={group.heading} className="admin-nav-group">
          <p className="admin-nav-heading">{group.heading}</p>
          {group.items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={`${item.label}: ${item.description}`}
                className={`admin-nav-link ${active ? 'is-active' : ''}`}
              >
                <span className="admin-nav-indicator" aria-hidden="true" />
                <span className="admin-nav-copy">
                  <span className="admin-nav-label">{item.label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="admin-layout">
      <a href="#admin-main" className="admin-skip-link">Skip to content</a>

      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar-brand">
          <div>
            <span className="admin-sidebar-brand-name">World Direct Link</span>
            <span className="admin-sidebar-brand-sub">Admin Console</span>
          </div>
        </div>
        {renderNav()}
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-user-role">{normalizeRole(user.role)}</div>
          <div className="admin-sidebar-user-name">{user.name}</div>
          <div className="admin-sidebar-user-email">{user.email}</div>
        </div>
      </aside>

      {drawerOpen && (
        <>
          <div
            className="admin-drawer-backdrop is-open"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="admin-drawer is-open"
            aria-modal="true"
            role="dialog"
            aria-label="Admin menu"
          >
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
                x
              </button>
            </div>
            {renderNav()}
            <div className="admin-sidebar-user">
              <div className="admin-sidebar-user-role">{normalizeRole(user.role)}</div>
              <div className="admin-sidebar-user-name">{user.name}</div>
            </div>
          </aside>
        </>
      )}

      <div className="admin-main-area">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-hamburger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
            >
              Menu
            </button>
            <div className="admin-topbar-meta">
              <div className="admin-topbar-title">{pageTitle}</div>
              <div className="admin-topbar-description">{pageDescription}</div>
            </div>
          </div>
          <div className="admin-topbar-right">
            <GlobalSearch />
            {siteUrl && (
              <a className="admin-topbar-link" href={siteUrl} target="_blank" rel="noopener noreferrer">
                View site
              </a>
            )}
            <span className="admin-role-chip">{normalizeRole(user.role)}</span>
            <form action={logoutAction}>
              <button type="submit" className="admin-logout-btn">Sign Out</button>
            </form>
          </div>
        </header>

        {crumbs.length > 0 && (
          <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
            {crumbs.map((c) => (
              <span key={c.href} className="admin-crumb">
                {c.last ? (
                  <span aria-current="page" className="admin-crumb-current">{c.label}</span>
                ) : (
                  <Link href={c.href}>{c.label}</Link>
                )}
              </span>
            ))}
          </nav>
        )}

        <main id="admin-main" className="admin-content">{children}</main>
      </div>
    </div>
  );
}
