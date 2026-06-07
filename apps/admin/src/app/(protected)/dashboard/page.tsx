import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { apiListPages } from '@/lib/api';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let totalPages = 0;
  let publishedPages = 0;
  let draftPages = 0;

  try {
    const pages = await apiListPages(session.accessToken);
    totalPages = pages.length;
    publishedPages = pages.filter((p) => p.status === 'PUBLISHED').length;
    draftPages = pages.filter((p) => p.status === 'DRAFT').length;
  } catch {
    // Show zeros on error
  }

  const stats = [
    { label: 'Total Pages', value: totalPages, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    {
      label: 'Published',
      value: publishedPages,
      color: 'bg-green-50 text-green-700 border-green-200',
    },
    { label: 'Drafts', value: draftPages, color: 'bg-gray-50 text-gray-700 border-gray-200' },
  ];

  const quickLinks = [
    { href: '/pages/new', label: 'New Page', desc: 'Create a new CMS page' },
    { href: '/nav', label: 'Edit Navigation', desc: 'Manage nav items & order' },
    { href: '/settings', label: 'Settings', desc: 'Configure site settings' },
    { href: '/users', label: 'Users', desc: 'Manage admin users' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back, {session.user.name}. Here&apos;s an overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-6 ${stat.color}`}
          >
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="text-sm font-medium mt-1 opacity-80">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-primary hover:shadow-sm transition-all group"
            >
              <div className="font-semibold text-gray-900 group-hover:text-primary text-sm mb-1">
                {link.label}
              </div>
              <div className="text-xs text-gray-500">{link.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Recent activity</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 text-center py-4">
            Activity log coming soon. Navigate to{' '}
            <Link href="/pages" className="text-primary hover:underline">
              Pages
            </Link>{' '}
            to manage your content.
          </p>
        </div>
      </div>
    </div>
  );
}
