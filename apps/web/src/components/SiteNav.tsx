import { getNav } from '@/lib/api';
import type { NavItem } from '@/lib/api';
import Link from 'next/link';

export default async function SiteNav() {
  const navItems = await getNav('HEADER');
  const visibleItems = navItems
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link
            href="/"
            className="flex-shrink-0 text-primary font-bold text-xl tracking-tight hover:opacity-80 transition-opacity"
          >
            World Direct Link
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {visibleItems.map((item) => (
              <NavLink key={item.id} item={item} />
            ))}
          </nav>

          {/* Agent Portal CTA */}
          <div className="hidden md:flex items-center">
            <a
              href="http://localhost:3001/login"
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Agent Portal
            </a>
          </div>

          {/* Mobile hamburger */}
          <MobileMenu items={visibleItems} />
        </div>
      </div>
    </header>
  );
}

function NavLink({ item }: { item: NavItem }) {
  if (item.children && item.children.length > 0) {
    return (
      <div className="relative group">
        <button className="text-gray-700 hover:text-primary font-medium text-sm transition-colors flex items-center gap-1">
          {item.label}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-10">
          {item.children
            .filter((child) => child.visible)
            .sort((a, b) => a.order - b.order)
            .map((child) => (
              <Link
                key={child.id}
                href={child.href}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
              >
                {child.label}
              </Link>
            ))}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="text-gray-700 hover:text-primary font-medium text-sm transition-colors"
    >
      {item.label}
    </Link>
  );
}

function MobileMenu({ items }: { items: NavItem[] }) {
  return (
    <div className="md:hidden">
      <details className="group">
        <summary className="list-none cursor-pointer p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none">
          <span className="sr-only">Open menu</span>
          {/* Hamburger icon */}
          <svg
            className="w-6 h-6 block group-open:hidden"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {/* Close icon */}
          <svg
            className="w-6 h-6 hidden group-open:block"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </summary>

        <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-md z-40">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1" aria-label="Mobile navigation">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 hover:text-primary font-medium text-sm transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 pb-1 border-t border-gray-100 mt-1">
              <a
                href="http://localhost:3001/login"
                className="block w-full text-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Agent Portal
              </a>
            </div>
          </nav>
        </div>
      </details>
    </div>
  );
}
