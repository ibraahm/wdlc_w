import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiGetAuditLog, apiDashboardSummary, type DashboardSummary } from '@/lib/api';

export const dynamic = 'force-dynamic';

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
    'admin.login.success': 'Signed in',
    'admin.user.create': 'Created admin user',
    'agent.application.status.change': 'Application status changed',
    'agent.dd.file.create': 'Opened DD file',
    'agent.dd.stage.change': 'DD stage changed',
    'agent.dd.branch_code.set': 'Branch code assigned',
    'agent.portal.provisioned': 'Portal account issued',
    'training.course.create': 'Created course',
    'training.course.update': 'Updated course',
    'training.quiz.submit': 'Quiz submitted',
  };
  return map[action] ?? action;
}

const EMPTY: DashboardSummary = {
  applications: { total: 0, new: 0, reviewing: 0, approved: 0, rejected: 0, pending: 0 },
  pipeline: { application: 0, underReview: 0, ddInProgress: 0, active: 0, suspended: 0, terminated: 0 },
  branches: { active: 0, portalUsers: 0, principals: 0, tellers: 0, unverifiedUsers: 0 },
  dd: { expired: 0, expiring: 0, missing: 0, reviewsDue: 0 },
  tellerApplicationsPending: 0,
  submissionsOpen: 0,
  training: { coursesPublished: 0, coursesPastDue: 0, completionsTotal: 0, completionsPassed: 0 },
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let s: DashboardSummary = EMPTY;
  let auditItems: Awaited<ReturnType<typeof apiGetAuditLog>>['items'] = [];

  await Promise.allSettled([
    apiDashboardSummary(session.accessToken).then((r) => { s = r; }),
    apiGetAuditLog(session.accessToken, { take: 12 }).then((r) => { auditItems = r.items; }),
  ]);

  const kpis = [
    { label: 'Applications to review', value: s.applications.pending, href: '/applications', tone: 'blue' as const, sub: `${s.applications.total} total` },
    { label: 'Active branches', value: s.branches.active, href: '/branches', tone: 'green' as const, sub: `${s.branches.portalUsers} portal users` },
    { label: 'Teller applications', value: s.tellerApplicationsPending, href: '/tellers', tone: 'amber' as const, sub: 'pending review' },
    { label: 'Open submissions', value: s.submissionsOpen, href: '/submissions', tone: 'purple' as const, sub: 'awaiting reply' },
    { label: 'Courses past due', value: s.training.coursesPastDue, href: '/training/reports', tone: s.training.coursesPastDue > 0 ? 'red' : 'gray', sub: `${s.training.completionsPassed} passes` },
  ] as { label: string; value: number; href: string; tone: string; sub: string }[];
  const kpiTone: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    green: 'border-green-200 bg-green-50 text-green-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    purple: 'border-purple-200 bg-purple-50 text-purple-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    gray: 'border-smoke bg-white text-navy',
  };

  const pipeline = [
    { label: 'Application', value: s.pipeline.application },
    { label: 'Under review', value: s.pipeline.underReview },
    { label: 'DD in progress', value: s.pipeline.ddInProgress },
    { label: 'Active', value: s.pipeline.active },
  ];

  const attention = [
    { label: 'DD documents expired', value: s.dd.expired, href: '/agent-dd', tone: 'red' as const },
    { label: 'DD reviews due', value: s.dd.reviewsDue, href: '/agent-dd', tone: 'amber' as const },
    { label: 'DD documents expiring', value: s.dd.expiring, href: '/agent-dd', tone: 'amber' as const },
    { label: 'DD documents missing', value: s.dd.missing, href: '/agent-dd', tone: 'gray' as const },
    { label: 'Unverified portal users', value: s.branches.unverifiedUsers, href: '/branches', tone: 'amber' as const },
  ].filter((a) => a.value > 0);
  const attnTone: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  const quickLinks = [
    { href: '/applications', label: 'Applications', desc: 'Review agent leads' },
    { href: '/agent-dd', label: 'Due Diligence', desc: 'Onboarding and ongoing DD' },
    { href: '/branches', label: 'Active Agents', desc: 'Branches and portal users' },
    { href: '/training/courses', label: 'Training', desc: 'Courses and quizzes' },
    { href: '/submissions', label: 'Submissions', desc: 'Website messages' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-sub">
          Welcome back, {session.user.name}. Here&apos;s the state of the business at a glance.
        </p>
      </div>

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="admin-section-title">Key metrics</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${kpiTone[k.tone]}`}>
              <div className="text-3xl font-bold">{k.value}</div>
              <div className="mt-1 text-xs font-semibold">{k.label}</div>
              <div className="mt-0.5 text-[11px] opacity-70">{k.sub}</div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading" className="admin-section-title">Agent onboarding pipeline</h2>
        <div className="flex flex-wrap items-stretch gap-2">
          {pipeline.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-2">
              <Link href="/agent-dd" className="min-w-[120px] rounded-xl border border-smoke bg-white p-4 text-center transition-shadow hover:shadow-sm">
                <div className="text-2xl font-bold text-navy">{stage.value}</div>
                <div className="mt-1 text-xs font-medium text-charcoal/60">{stage.label}</div>
              </Link>
              {i < pipeline.length - 1 && <span className="text-charcoal/30" aria-hidden>&rarr;</span>}
            </div>
          ))}
          {(s.pipeline.suspended > 0 || s.pipeline.terminated > 0) && (
            <div className="ml-auto flex items-center gap-3 self-center text-xs text-charcoal/50">
              {s.pipeline.suspended > 0 && <span>Suspended: <strong>{s.pipeline.suspended}</strong></span>}
              {s.pipeline.terminated > 0 && <span>Terminated: <strong>{s.pipeline.terminated}</strong></span>}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="admin-section-title">Needs attention</h2>
        {attention.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {attention.map((a) => (
              <Link key={a.label} href={a.href} className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${attnTone[a.tone]}`}>
                <div className="text-2xl font-bold">{a.value}</div>
                <div className="mt-1 text-xs font-medium">{a.label}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
            All clear. No expiring documents, reviews due, or unverified users.
          </div>
        )}
      </section>

      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="admin-section-title">Quick actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="group block rounded-xl border border-smoke bg-white p-5 transition-all hover:border-gold hover:shadow-sm">
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
                  <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase text-charcoal/50 md:table-cell">By</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-charcoal/50">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-smoke">
                {auditItems.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-ivory/60">
                    <td className="px-6 py-3 text-sm font-medium text-navy">{actionLabel(entry.action)}</td>
                    <td className="hidden px-6 py-3 text-sm text-charcoal/60 md:table-cell">
                      {entry.admin?.name ?? entry.admin?.email ?? entry.agent?.email ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right text-sm text-charcoal/50">{timeAgo(entry.createdAt)}</td>
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
