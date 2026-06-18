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
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

// Plain-language due line, e.g. "Due June 1, 2026 (in 5 days)" / "(5 days late)".
function dueText(c: CourseSummary): string | null {
  if (!c.dueAt) return null;
  const base = `Due ${fmtDate(c.dueAt)}`;
  if (c.completed) return base;
  const days = daysUntil(c.dueAt);
  if (days < 0) return `${base} (${-days} day${days === -1 ? '' : 's'} late)`;
  if (days === 0) return `${base} (due today)`;
  return `${base} (in ${days} day${days === 1 ? '' : 's'})`;
}

const badge = (text: string, color: string, bg: string) => (
  <span style={{ fontSize: '0.75rem', fontWeight: 700, color, background: bg, padding: '3px 10px', borderRadius: '6px' }}>{text}</span>
);

function CourseCard({ c }: { c: CourseSummary }) {
  // The whole card is a link; this looks like a button to make the action obvious.
  const buttonStyle = (filled: boolean, color: string): React.CSSProperties => ({
    display: 'inline-block', marginTop: '14px', padding: '11px 22px', borderRadius: '8px',
    fontSize: '0.95rem', fontWeight: 700, textAlign: 'center',
    background: filled ? color : '#fff', color: filled ? '#fff' : color,
    border: `2px solid ${color}`,
  });

  let action: React.ReactNode;
  if (c.completed) {
    action = <span style={buttonStyle(false, '#166534')}>✓ Completed — view</span>;
  } else if (c.excused) {
    action = <span style={buttonStyle(false, '#166534')}>View</span>;
  } else if (c.progressPct > 0) {
    action = <span style={buttonStyle(true, 'var(--gold)')}>Continue</span>;
  } else {
    action = <span style={buttonStyle(true, 'var(--gold)')}>Start course</span>;
  }

  const due = dueText(c);

  return (
    <a href={`/training/${c.slug}`} className="dash-card" style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
        <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--charcoal)' }}>{c.title}</p>
        {c.overdue && badge('Past due', '#b91c1c', 'rgba(185,28,28,0.10)')}
        {c.excused && badge(c.excusedType === 'EQUIVALENCY' ? 'Credited' : 'Waived', '#166534', 'rgba(22,101,52,0.10)')}
      </div>

      {c.description && <p style={{ fontSize: '0.92rem', color: 'var(--charcoal)', lineHeight: 1.6, margin: '0 0 8px' }}>{c.description}</p>}

      <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: '0 0 2px' }}>
        {c.questionCount} question{c.questionCount === 1 ? '' : 's'} · You need {c.passingScore}% to pass
        {c.assignedReason ? ` · Required (${REASON_LABEL[c.assignedReason] ?? 'assigned'})` : ''}
        {c.languages.length > 1 ? ` · Available in ${c.languages.map((l) => LANG_LABEL[l] || l.toUpperCase()).join(', ')}` : ''}
      </p>
      {due && <p style={{ fontSize: '0.88rem', fontWeight: c.overdue ? 700 : 400, color: c.overdue ? '#b91c1c' : 'var(--muted)', margin: 0 }}>{due}</p>}

      {!c.completed && !c.excused && c.lessonCount > 0 && (
        <div style={{ marginTop: '12px', maxWidth: '360px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '4px' }}>
            {c.progressPct === 0 ? 'Not started yet' : `${c.progressPct}% done (${c.lessonsDone} of ${c.lessonCount} lessons)`}
          </div>
          <div role="progressbar" aria-valuenow={c.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.title} progress`} style={{ height: '8px', background: 'var(--smoke)', borderRadius: '4px' }}>
            <div style={{ height: '100%', width: `${c.progressPct}%`, background: 'var(--gold)', borderRadius: '4px' }} />
          </div>
        </div>
      )}

      {c.completed && c.bestScore != null && (
        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#166534', margin: '10px 0 0' }}>✓ Passed with {c.bestScore}%</p>
      )}

      {action}
    </a>
  );
}

function GroupHeading({ label, hint }: { label: string; hint?: string }) {
  return (
    <div style={{ margin: '22px 0 10px' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>{label}</h2>
      {hint && <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '2px 0 0' }}>{hint}</p>}
    </div>
  );
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

  const byDue = (a: CourseSummary, b: CourseSummary) =>
    (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity);
  overdue.sort(byDue);
  dueSoon.sort(byDue);

  const pct = courses.length ? Math.round((completed.length / courses.length) * 100) : 0;

  return (
    <div className="portal-content">
      <h1 className="dash-title">My Training</h1>
      {courses.length > 0 && (
        <p style={{ fontSize: '0.95rem', color: 'var(--charcoal)', lineHeight: 1.6, margin: '0 0 18px' }}>
          These are the courses assigned to you. Tap a course to begin. Please finish anything marked{' '}
          <span style={{ color: '#b91c1c', fontWeight: 700 }}>Past due</span> first.
        </p>
      )}

      {courses.length === 0 ? (
        <div className="dash-card">
          <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>No courses yet</p>
          <p style={{ fontSize: '0.92rem', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
            When World Direct Link assigns training to you, it will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="dash-card" style={{ borderLeft: '4px solid var(--gold)' }}>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 8px' }}>
              You have completed {completed.length} of {courses.length} course{courses.length === 1 ? '' : 's'} ({pct}%)
            </p>
            <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Overall training completion" style={{ height: '10px', background: 'var(--smoke)', borderRadius: '5px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: '5px', transition: 'width 0.4s' }} />
            </div>
            {overdue.length > 0 && (
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b91c1c', margin: '10px 0 0' }}>
                {overdue.length} course{overdue.length === 1 ? ' is' : 's are'} past due — please complete {overdue.length === 1 ? 'it' : 'them'} as soon as possible.
              </p>
            )}
          </div>

          {overdue.length > 0 && (
            <>
              <GroupHeading label="Past due" hint="These were due already. Please finish them first." />
              <div style={{ display: 'grid', gap: '14px' }}>{overdue.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
            </>
          )}

          {dueSoon.length > 0 && (
            <>
              <GroupHeading label="Due soon" hint="Due within the next two weeks." />
              <div style={{ display: 'grid', gap: '14px' }}>{dueSoon.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
            </>
          )}

          {remaining.length > 0 && (
            <>
              <GroupHeading label="Still to do" />
              <div style={{ display: 'grid', gap: '14px' }}>{remaining.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
            </>
          )}

          {excused.length > 0 && (
            <>
              <GroupHeading label="Waived" hint="You do not need to complete these." />
              <div style={{ display: 'grid', gap: '14px' }}>{excused.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
            </>
          )}

          {completed.length > 0 && (
            <>
              <GroupHeading label="Completed" hint="Well done — these are finished." />
              <div style={{ display: 'grid', gap: '14px' }}>{completed.map((c) => <CourseCard key={c.slug} c={c} />)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
