import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiCourses, type CourseSummary } from '@/lib/api';

export const dynamic = 'force-dynamic';

const LANG_LABEL: Record<string, string> = {
  en: 'English', es: 'Español', fr: 'Français', pt: 'Português', zh: '中文', ar: 'العربية', vi: 'Tiếng Việt', ht: 'Kreyòl',
};

const REASON_LABEL: Record<string, string> = {
  NEW_HIRE: 'New hire', ANNUAL: 'Annual', HAZARD: 'Safety', ROLE: 'Role', REMEDIATION: 'Remediation', OTHER: 'Assigned',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

function CourseCard({ c }: { c: CourseSummary }) {
  const due = c.dueAt ? daysUntil(c.dueAt) : null;
  return (
    <a href={`/training/${c.slug}`} className="dash-card" style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <p className="dash-card-title" style={{ margin: 0, padding: 0, border: 0, fontSize: '0.95rem', letterSpacing: 0, textTransform: 'none', color: 'var(--charcoal)' }}>{c.title}</p>
            {c.overdue && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#b91c1c', background: 'rgba(185,28,28,0.08)', padding: '2px 8px', borderRadius: '10px' }}>OVERDUE</span>}
            {c.excused && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#166534', background: 'rgba(22,101,52,0.08)', padding: '2px 8px', borderRadius: '10px' }}>{c.excusedType === 'EQUIVALENCY' ? 'CREDITED' : 'WAIVED'}</span>}
            {c.assignedReason && <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--muted)', border: '1px solid var(--smoke)', padding: '2px 8px', borderRadius: '10px' }}>{REASON_LABEL[c.assignedReason] ?? 'Assigned'}</span>}
            {c.languages.length > 1 && <span style={{ fontSize: '0.62rem', color: 'var(--muted)', border: '1px solid var(--smoke)', padding: '2px 8px', borderRadius: '10px' }}>{c.languages.map((l) => LANG_LABEL[l] || l.toUpperCase()).join(' · ')}</span>}
          </div>
          {c.description && <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6 }}>{c.description}</p>}
          <p style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: '8px' }}>
            {c.lessonCount > 0 && <>{c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'} · </>}
            {c.questionCount} question{c.questionCount === 1 ? '' : 's'} · Pass {c.passingScore}%
            {c.dueAt && <> · Due {fmtDate(c.dueAt)}{due !== null && !c.completed && due >= 0 ? ` (${due}d)` : ''}</>}
          </p>
          <div style={{ marginTop: '10px', maxWidth: '320px' }}>
            <div style={{ height: '4px', background: 'var(--smoke)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${c.completed ? 100 : c.progressPct}%`, background: c.completed ? '#166534' : 'var(--gold)', borderRadius: '2px' }} />
            </div>
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {c.completed ? (
            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#166534', whiteSpace: 'nowrap' }}>✓ Passed{c.bestScore != null ? ` · ${c.bestScore}%` : ''}</span>
          ) : (
            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--gold)', whiteSpace: 'nowrap' }}>{c.progressPct > 0 ? 'Continue →' : 'Start →'}</span>
          )}
        </div>
      </div>
    </a>
  );
}

function GroupHeading({ label }: { label: string }) {
  return <p style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', margin: '18px 0 8px' }}>{label}</p>;
}

export default async function TrainingPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let courses: CourseSummary[];
  try {
    courses = await apiCourses(session.accessToken);
  } catch {
    courses = [];
  }

  const completed = courses.filter((c) => c.completed);
  const excused = courses.filter((c) => !c.completed && c.excused);
  const incomplete = courses.filter((c) => !c.completed && !c.excused);
  const overdue = incomplete.filter((c) => c.overdue);
  const dueSoon = incomplete.filter((c) => !c.overdue && c.dueAt && daysUntil(c.dueAt) <= 14);
  const dueSoonIds = new Set(dueSoon.map((c) => c.slug));
  const remaining = incomplete.filter((c) => !c.overdue && !dueSoonIds.has(c.slug));

  // Sort the time-sensitive groups by deadline.
  const byDue = (a: CourseSummary, b: CourseSummary) =>
    (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity);
  overdue.sort(byDue);
  dueSoon.sort(byDue);

  const pct = courses.length ? Math.round((completed.length / courses.length) * 100) : 0;

  return (
    <div className="portal-content">
      <div className="dash-eyebrow">Agent Portal</div>
      <h1 className="dash-title">My Training</h1>

      {courses.length === 0 ? (
        <div className="dash-card">
          <p className="dash-card-title">No courses assigned yet</p>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
            When World Direct Link assigns training to you or your branch, it will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="dash-card" style={{ borderLeft: '3px solid var(--gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '6px' }}>
              <span>{completed.length} of {courses.length} complete{overdue.length > 0 ? ` · ${overdue.length} overdue` : ''}{dueSoon.length > 0 ? ` · ${dueSoon.length} due soon` : ''}</span>
              <span>{pct}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--smoke)', borderRadius: '3px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: '3px', transition: 'width 0.4s' }} />
            </div>
          </div>

          {overdue.length > 0 && (
            <>
              <GroupHeading label={`Overdue (${overdue.length})`} />
              <div style={{ display: 'grid', gap: '12px' }}>{overdue.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
            </>
          )}

          {dueSoon.length > 0 && (
            <>
              <GroupHeading label={`Due soon (${dueSoon.length})`} />
              <div style={{ display: 'grid', gap: '12px' }}>{dueSoon.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
            </>
          )}

          {remaining.length > 0 && (
            <>
              <GroupHeading label="To do" />
              <div style={{ display: 'grid', gap: '12px' }}>{remaining.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
            </>
          )}

          {excused.length > 0 && (
            <>
              <GroupHeading label={`Waived (${excused.length})`} />
              <div style={{ display: 'grid', gap: '12px' }}>{excused.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
            </>
          )}

          {completed.length > 0 && (
            <>
              <GroupHeading label={`Completed (${completed.length})`} />
              <div style={{ display: 'grid', gap: '12px' }}>{completed.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
