import Link from 'next/link';
import { getSession } from '@/lib/auth';
import {
  apiListPages,
  apiGetAuditLog,
  apiListApplications,
  apiDDDashboard,
  type DDDashboard,
} from '@/lib/api';
import { redirect } from 'next/navigation';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    'page.create': 'Created page',
    'page.update': 'Updated page',
    'page.publish': 'Published page',
    'page.unpublish': 'Unpublished page',
    'page.delete': 'Deleted page',
    'nav.create': 'Added nav item',
    'nav.update': 'Updated nav item',
    'nav.delete': 'Removed nav item',
    'nav.reorder': 'Reordered nav',
    'setting.set': 'Changed setting',
    'setting.delete': 'Deleted setting',
    'admin.login.success': 'Signed in',
    'admin.login.failed': 'Failed sign-in',
    'admin.login.locked': 'Account locked',
    'admin.logout': 'Signed out',
    'admin.user.create': 'Created admin user',
    'admin.user.activated': 'Activated user',
    'admin.user.deactivated': 'Deactivated user',
    'agent.application.status.change': 'Application status changed',
    'agent.dd.file.create': 'Opened DD file',
    'agent.dd.document.update': 'Updated DD document',
    'agent.dd.stage.change': 'DD stage changed',
    'agent.dd.risk.change': 'DD risk changed',
    'agent.dd.review.record': 'Recorded DD review',
  };
  return map[action] ?? action;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let totalPages = 0;
  let publishedPages = 0;
  let draftPages = 0;
  let pendingApps = 0;
  let totalApps = 0;
  let dd: DDDashboard = { expiring: 0, expired: 0, missing: 0, reviewsDue: 0 };
  let auditItems: Awaited<ReturnType<typeof apiGetAuditLog>>['items'] = [];

  await Promise.allSettled([
    apiListPages(session.accessToken).then((pages) => {
      totalPages = pages.length;
      publishedPages = pages.filter((p) => p.status === 'PUBLISHED').length;
      draftPages = pages.filter((p) => p.status === 'DRAFT').length;
    }),
    apiListApplications(session.accessToken).then((apps) => {
      totalApps = apps.length;
      pendingApps = apps.filter((a) => a.status === 'NEW' || a.status === 'REVIEWING').length;
    }),
    apiDDDashboard(session.accessToken).then((d) => {
      dd = d;
    }),
    apiGetAuditLog(session.accessToken, { take: 15 }).then((r) => {
      auditItems = r.items;
    }),
  ]);

  // Surfaced first when non-zero: the things an operator must act on.
  const attention = [
    { label: 'Applications to review', value: pendingApps, href: '/applications', tone: 'blue' as const },
    { label: 'DD documents expired', value: dd.expired, href: '/agent-dd', tone: 'red' as const },
    { label: 'DD documents expiring', value: dd.expiring, href: '/agent-dd', tone: 'amber' as const },
    { label: 'DD reviews due', value: dd.reviewsDue, href: '/agent-dd', tone: 'amber' as const },
    { label: 'DD documents missing', value: dd.missing, href: '/agent-dd', tone: 'gray' as const },
  ];
  const hasAttention = attention.some((a) => a.value > 0);

  const toneClasses: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  const stats = [
    { label: 'Total Pages', value: totalPages, color: 'bg-ivory border-smoke text-navy' },
    { label: 'Published', value: publishedPages, color: 'bg-green-50 border-green-200 text-green-800' },
    { label: 'Drafts', value: draftPages, color: 'bg-amber-50 border-amber-200 text-amber-800' },
    { label: 'Agent Applications', value: totalApps, color: 'bg-ivory border-smoke text-navy' },
  ];

  const quickLinks = [
    { href: '/pages/new', label: 'New Page', desc: 'Create a new CMS page' },
    { href: '/applications', label: 'Applications', desc: 'Review agent leads' },
    { href: '/agent-dd', label: 'Due Diligence', desc: 'Onboarding & ongoing DD' },
    { href: '/settings', label: 'Settings', desc: 'Configure site settings' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-sub">Welcome back, {session.user.name}.</p>
      </div>

      {/* Needs attention — only when there's something to act on */}
      <div>
        <h2 className="admin-section-title">Needs attention</h2>
        {hasAttention ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {attention
              .filter((a) => a.value > 0)
              .map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${toneClasses[a.tone]}`}
                >
                  <div className="text-2xl font-bold">{a.value}</div>
                  <div className="text-xs font-medium mt-1">{a.label}</div>
                </Link>
              ))}
          </div>
        ) : (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
            All clear — no pending applications, expiring documents, or reviews due.
          </div>
        )}
      </div>

      <div>
        <h2 className="admin-section-title">Content</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-xl border p-6 ${stat.color}`}>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm font-medium mt-1 opacity-75">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="admin-section-title">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}
              className="block bg-white rounded-xl border border-smoke p-5 hover:border-gold hover:shadow-sm transition-all group">
              <div className="font-semibold text-navy group-hover:text-gold text-sm mb-1">{link.label}</div>
              <div className="text-xs text-charcoal/60">{link.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="admin-section-title">Recent activity</h2>
        <div className="bg-white rounded-xl border border-smoke overflow-hidden">
          {auditItems.length === 0 ? (
            <p className="text-sm text-charcoal/50 text-center py-8">No activity yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-smoke">
              <thead>
                <tr className="bg-ivory">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal/50 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal/50 uppercase">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal/50 uppercase hidden md:table-cell">By</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-charcoal/50 uppercase">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-smoke">
                {auditItems.map((entry) => (
                  <tr key={entry.id} className="hover:bg-ivory/60 transition-colors">
                    <td className="px-6 py-3 text-sm text-navy font-medium">{actionLabel(entry.action)}</td>
                    <td className="px-6 py-3 text-sm text-charcoal/60 font-mono">
                      {entry.entityId ? (
                        entry.entity === 'Page'
                          ? <Link href={`/pages/${entry.entityId}`} className="hover:text-gold hover:underline">{entry.entityId}</Link>
                          : entry.entityId
                      ) : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-charcoal/60 hidden md:table-cell">
                      {entry.admin?.name ?? entry.admin?.email ?? entry.agent?.email ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-charcoal/50 text-right whitespace-nowrap">
                      {timeAgo(entry.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
