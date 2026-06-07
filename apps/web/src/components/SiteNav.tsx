import Link from 'next/link';
import { headerNav, company, type NavNode } from '@/lib/site';

export default function SiteNav() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Utility bar */}
      <div className="bg-gray-900 text-gray-300 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9">
          <span className="hidden sm:inline">Toll-Free: <a href={`tel:${company.tollFree}`} className="text-white hover:underline">{company.tollFree}</a></span>
          <div className="flex items-center gap-4">
            <Link href="/services/track" className="hover:text-white">Track Transfer</Link>
            <span aria-hidden="true" className="text-gray-600">|</span>
            <span className="text-gray-400">English</span>
            <span aria-hidden="true" className="text-gray-600">/</span>
            <span className="text-gray-500">Soomaali</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex-shrink-0 flex flex-col leading-none hover:opacity-80 transition-opacity">
            <span className="text-primary font-bold text-xl tracking-tight">World Direct Link</span>
            <span className="text-[11px] text-gray-500 font-medium">{company.tagline}</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
            {headerNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/services/track"
              className="text-gray-700 hover:text-primary font-medium text-sm transition-colors"
            >
              Track Transfer
            </Link>
            <Link
              href="/agents/become-an-agent"
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-strong transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Find an Agent
            </Link>
          </div>

          <MobileMenu items={headerNav} />
        </div>
      </div>
    </header>
  );
}

function NavLink({ item }: { item: NavNode }) {
  if (item.children && item.children.length > 0) {
    return (
      <div className="relative group">
        <Link href={item.href} className="text-gray-700 hover:text-primary font-medium text-sm transition-colors flex items-center gap-1">
          {item.label}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Link>
        <div className="absolute top-full left-0 pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-10">
          <div className="bg-white border border-gray-200 rounded-md shadow-lg py-1">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={item.href} className="text-gray-700 hover:text-primary font-medium text-sm transition-colors">
      {item.label}
    </Link>
  );
}

function MobileMenu({ items }: { items: NavNode[] }) {
  return (
    <div className="lg:hidden">
      <details className="group">
        <summary className="list-none cursor-pointer p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none">
          <span className="sr-only">Open menu</span>
          <svg className="w-6 h-6 block group-open:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg className="w-6 h-6 hidden group-open:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </summary>

        <div className="absolute top-[6.25rem] left-0 right-0 bg-white border-b border-gray-200 shadow-md z-40 max-h-[80vh] overflow-y-auto">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1" aria-label="Mobile navigation">
            {items.map((item) => (
              <div key={item.href} className="py-1">
                <Link href={item.href} className="block px-3 py-2 rounded-md text-gray-900 font-semibold text-sm hover:bg-gray-50 hover:text-primary">
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-3 mt-1 flex flex-col border-l border-gray-100 pl-3">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href} className="block px-3 py-1.5 rounded-md text-gray-600 text-sm hover:bg-gray-50 hover:text-primary">
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-2 pb-1 border-t border-gray-100 mt-1">
              <Link href="/agents/become-an-agent" className="block w-full text-center px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-strong transition-colors">
                Find an Agent
              </Link>
            </div>
          </nav>
        </div>
      </details>
    </div>
  );
}
