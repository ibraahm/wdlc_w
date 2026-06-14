import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiAgentProfile, type AgentProfile } from '@/lib/api';

export const dynamic = 'force-dynamic';

function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}
function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STAGE_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  TERMINATED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-100 text-red-700',
};
const DOC_STYLE: Record<string, string> = {
  OK: 'text-green-700', EXPIRING: 'text-amber-700', EXPIRED: 'text-red-700', MISSING: 'text-red-700', NA: 'text-gray-400',
};

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-smoke bg-white">
      <div className="flex items-center justify-between border-b border-smoke px-5 py-3">
        <h2 className="text-sm font-semibold text-navy">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-charcoal/55">{label}</span>
      <span className="text-right font-medium text-navy">{value ?? '—'}</span>
    </div>
  );
}

export default async function AgentProfilePage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  let p: AgentProfile;
  try {
    p = await apiAgentProfile(session.accessToken, params.id);
  } catch {
    notFound();
  }

  const { ddFile, application, users, training, timeline } = p;
  const app = application || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/agent-dd" className="text-xs text-charcoal/50 hover:text-gold">← Due Diligence</Link>
          <h1 className="admin-page-title mt-1">{ddFile.agentName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {ddFile.branchCode && <span className="rounded bg-ivory px-2 py-0.5 font-mono text-xs text-navy">{ddFile.branchCode}</span>}
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STAGE_STYLE[ddFile.stage] ?? 'bg-blue-100 text-blue-700'}`}>{ddFile.stage}</span>
            {ddFile.riskRating && <span className="text-xs text-charcoal/60">Risk: {ddFile.riskRating}</span>}
            <span className={`text-xs font-medium ${ddFile.compliant ? 'text-green-700' : 'text-red-700'}`}>
              {ddFile.compliant ? '✓ Compliant' : '⚠ Action needed'}
            </span>
          </div>
        </div>
        <Link href={`/agent-dd/${ddFile.id}`} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90">
          Open DD file →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Business / application */}
        <Card title="Business & contact" action={application ? <Link href="/applications" className="text-xs text-gold hover:underline">Application</Link> : undefined}>
          {application ? (
            <div className="divide-y divide-smoke/60">
              <Row label="Contact" value={`${app.firstName ?? ''} ${app.lastName ?? ''}`.trim()} />
              <Row label="Company" value={app.company} />
              <Row label="Email" value={app.email} />
              <Row label="Phone" value={app.businessPhone} />
              <Row label="Location" value={[app.businessCity, app.businessState, app.businessCountry].filter(Boolean).join(', ')} />
              <Row label="Anticipated volume" value={app.anticipatedDollarVolume} />
              <Row label="Locations" value={app.totalLocations} />
              <Row label="Applied" value={fmtDate(app.createdAt)} />
            </div>
          ) : (
            <p className="text-sm text-charcoal/50">No linked application (manually created DD file).</p>
          )}
          <div className="mt-3 border-t border-smoke/60 pt-3">
            <Row label="Entity type" value={ddFile.entityType} />
            <Row label="States" value={ddFile.states} />
            <Row label="Regional office" value={ddFile.regionalOffice} />
          </div>
        </Card>

        {/* DD documents */}
        <Card title="Due-diligence documents" action={<Link href={`/agent-dd/${ddFile.id}`} className="text-xs text-gold hover:underline">Manage</Link>}>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {Object.entries(ddFile.documentSummary).filter(([, n]) => n > 0).map(([k, n]) => (
              <span key={k} className={`rounded-full bg-ivory px-2 py-0.5 font-medium ${DOC_STYLE[k] ?? ''}`}>{n} {k}</span>
            ))}
          </div>
          <div className="max-h-64 overflow-auto divide-y divide-smoke/60">
            {ddFile.documents.map((d) => (
              <div key={d.code} className="flex items-center justify-between py-1.5 text-sm">
                <span className="truncate pr-2 text-charcoal/70">{d.label}</span>
                <span className={`shrink-0 text-xs font-semibold ${DOC_STYLE[d.status] ?? ''}`}>
                  {d.status}{d.expiry ? ` · ${fmtDate(d.expiry)}` : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-smoke/60 pt-3">
            <Row label="Onboarded" value={fmtDate(ddFile.onboardedAt)} />
            <Row label="Last reviewed" value={`${fmtDate(ddFile.lastReviewedAt)}${ddFile.reviewedBy ? ` · ${ddFile.reviewedBy}` : ''}`} />
            <Row label="Next review due" value={fmtDate(ddFile.nextReviewDueAt)} />
          </div>
        </Card>

        {/* Portal users */}
        <Card title={`Portal users (${users.length})`} action={<Link href="/branches" className="text-xs text-gold hover:underline">Branches</Link>}>
          {users.length === 0 ? (
            <p className="text-sm text-charcoal/50">No portal accounts yet for this branch.</p>
          ) : (
            <div className="divide-y divide-smoke/60">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-navy">{u.firstName} {u.lastName}
                      <span className="ml-2 rounded bg-ivory px-1.5 py-0.5 text-[10px] font-semibold text-charcoal/60">{u.role}</span>
                    </div>
                    <div className="truncate text-xs text-charcoal/55">{u.email}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <div className={u.status === 'ACTIVE' ? 'text-green-700' : 'text-amber-700'}>{u.status}</div>
                    <div className="text-charcoal/45">{u.emailVerified ? 'verified' : 'unverified'}{u.lastLoginAt ? ` · ${timeAgo(u.lastLoginAt)}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Training */}
        <Card title="Training" action={<Link href="/training/reports" className="text-xs text-gold hover:underline">Reports</Link>}>
          {training.length === 0 ? (
            <p className="text-sm text-charcoal/50">No training completions recorded for this branch.</p>
          ) : (
            <div className="max-h-64 overflow-auto divide-y divide-smoke/60">
              {training.map((t) => {
                const u = users.find((x) => x.id === t.agentId);
                return (
                  <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-navy">{t.courseTitle}</div>
                      <div className="truncate text-xs text-charcoal/55">
                        {u ? `${u.firstName} ${u.lastName}` : 'former user'} · {fmtDate(t.completedAt)}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${t.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.passed ? 'Passed' : 'Failed'} {t.score}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Timeline */}
      <Card title="Activity timeline">
        {timeline.length === 0 ? (
          <p className="text-sm text-charcoal/50">No recorded activity.</p>
        ) : (
          <ol className="relative space-y-3 border-l border-smoke pl-5">
            {timeline.map((t) => (
              <li key={t.id} className="relative">
                <span className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-gold" aria-hidden />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm text-navy">{t.action}</span>
                  <span className="text-xs text-charcoal/45">{t.actor ? `${t.actor} · ` : ''}{timeAgo(t.createdAt)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
