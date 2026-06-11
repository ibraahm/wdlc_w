import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  apiGetAuditLog,
  apiListApplications,
  apiDDDashboard,
  type DDDashboard,
} from '@/lib/api';

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

  let pendingApps = 0;
  let totalApps = 0;
  let dd: DDDashboard = { expiring: 0, expired: 0, missing: 0, reviewsDue: 0 };
  let auditItems: Awaited<ReturnType<typeof apiGetAuditLog>>['items'] = [];

  await Promise.allSettled([
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
    { label: 'Agent Applications', value: totalApps, color: 'bg-ivory border-smoke text-navy' },
    { label: 'To review', value: pendingApps, color: 'bg-blue-50 border-blue-200 text-blue-800' },
  ];

  const quickLinks = [
    { href: '/applications', label: 'Applications', desc: 'Review agent leads' },
    { href: '/agent-dd', label: 'Due Diligence', desc: 'Onboarding and ongoing DD' },
    { href: '/submissions', label: 'Submissions', desc: 'Review website form messages' },
    { href: '/network', label: 'Network Map', desc: 'Maintain payout coverage' },
    { href: '/settings', label: 'Settings', desc: 'Configure site settings' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-sub">
          Welcome back, {session.user.name}. Start with items that need a decision, then jump into the workflow.
        </p>
      </div>

      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="admin-section-title">Needs attention</h2>
        {hasAttention ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {attention
              .filter((a) => a.value > 0)
              .map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${toneClasses[a.tone]}`}
                >
                  <div className="text-2xl font-bold">{a.value}</div>
                  <div className="mt-1 text-xs font-medium">{a.label}</div>
                </Link>
              ))}
          </div>
        ) : (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
            All clear. No pending applications, expiring documents, or reviews due.
          </div>
        )}
      </section>

      <section aria-labelledby="agents-heading">
        <h2 id="agents-heading" className="admin-section-title">Agents</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-xl border p-6 ${stat.color}`}>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="mt-1 text-sm font-medium opacity-75">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="admin-section-title">Quick actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-xl border border-smoke bg-white p-5 transition-all hover:border-gold hover:shadow-sm group"
            >
              <div className="mb-1 text-sm font-semibold text-navy group-hover:text-gold">{link.label}</div>
              <div className="text-xs text-charcoal/60">{link.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-activity-heading">
        <h2 id="recent-activity-heading" className="admin-section-title">Recent activity</h2>
        <div className="overflow-hidden rounded-xl border border-smoke bg-white">
          {auditItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-charcoal/50">No activity yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-smoke">
              <thead>
                <tr className="bg-ivory">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-charcoal/50">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-charcoal/50">Entity</th>
                  <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase text-charcoal/50 md:table-cell">By</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-charcoal/50">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-smoke">
                {auditItems.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-ivory/60">
                    <td className="px-6 py-3 text-sm font-medium text-navy">{actionLabel(entry.action)}</td>
                    <td className="px-6 py-3 font-mono text-sm text-charcoal/60">{entry.entityId ?? '-'}</td>
                    <td className="hidden px-6 py-3 text-sm text-charcoal/60 md:table-cell">
                      {entry.admin?.name ?? entry.admin?.email ?? entry.agent?.email ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right text-sm text-charcoal/50">
                      {timeAgo(entry.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
