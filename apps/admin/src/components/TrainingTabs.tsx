'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = { label: string; href: string };

export default function TrainingTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  if (tabs.length <= 1) return null;

  return (
    <div className="border-b border-gray-200 mb-5">
      <nav className="-mb-px flex flex-wrap gap-x-1" aria-label="Training sections">
        {tabs.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
