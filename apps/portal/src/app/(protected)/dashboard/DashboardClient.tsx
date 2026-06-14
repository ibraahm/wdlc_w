'use client';

import type { Agent, CourseSummary } from '@/lib/api';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ComplianceChecklist({ agent, trainingDone }: { agent: Agent; trainingDone: boolean }) {
  const steps = [
    { label: 'Account created', done: true },
    { label: 'Email verified', done: agent.emailVerified },
    { label: 'Account approved by World Direct Link', done: agent.status === 'ACTIVE' },
    { label: 'Complete all assigned training', done: trainingDone },
  ];
  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="dash-card">
      <p className="dash-card-title">Onboarding Checklist</p>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '6px' }}>
          <span>{completed} of {steps.length} complete</span>
          <span>{Math.round((completed / steps.length) * 100)}%</span>
        </div>
        <div style={{ height: '4px', background: 'var(--smoke)', borderRadius: '2px' }}>
          <div style={{ height: '100%', width: `${(completed / steps.length) * 100}%`, background: 'var(--gold)', borderRadius: '2px', transition: 'width 0.4s' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem', color: step.done ? '#166534' : 'var(--smoke)', flexShrink: 0 }}>
              {step.done ? '✓' : '○'}
            </span>
            <span style={{ fontSize: '0.84rem', color: step.done ? 'var(--charcoal)' : 'var(--muted)' }}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ value, label, tone }: { value: number; label: string; tone?: 'gold' | 'green' | 'red' }) {
  const color = tone === 'green' ? '#166534' : tone === 'red' ? '#b91c1c' : 'var(--gold)';
  return (
    <div className="dash-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', lineHeight: 1, color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginTop: '8px' }}>{label}</div>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a href={href} className="dash-card" style={{ display: 'block', textDecoration: 'none' }}>
      <p className="dash-card-title" style={{ marginBottom: '6px' }}>{title} →</p>
      <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</p>
    </a>
  );
}

export default function DashboardClient({ agent, courses }: { agent: Agent; courses: CourseSummary[] }) {
  const total = courses.length;
  const done = courses.filter((c) => c.completed).length;
  const overdue = courses.filter((c) => c.overdue);
  const incomplete = courses.filter((c) => !c.completed);
  // Due soon = has a due date within 14 days, not overdue, not complete.
  const soon = incomplete.filter((c) => {
    if (!c.dueAt || c.overdue) return false;
    const days = (new Date(c.dueAt).getTime() - Date.now()) / 86400000;
    return days <= 14;
  });
  const trainingDone = total > 0 && done === total;
  // Next course to nudge toward: an overdue one, else an in-progress one, else the first incomplete.
  const nextCourse = overdue[0] || incomplete.find((c) => c.progressPct > 0) || incomplete[0];

  return (
    <div className="portal-content">
      <div className="dash-eyebrow">Agent Portal</div>
      <h1 className="dash-title">Welcome back, {agent.firstName}</h1>

      {agent.status === 'PENDING' && (
        <div className="dash-card" style={{ borderLeft: '3px solid var(--gold)' }}>
          <p className="dash-card-title" style={{ color: 'var(--gold)' }}>Application Under Review</p>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
            Your agent application is pending approval by the World Direct Link compliance team.
            You will receive an email once your account has been reviewed. This typically takes 2-5 business days.
          </p>
        </div>
      )}

      {/* Overdue nudge - most urgent */}
      {overdue.length > 0 && (
        <div className="dash-card" style={{ borderLeft: '3px solid #b91c1c', background: 'rgba(185,28,28,0.03)' }}>
          <p className="dash-card-title" style={{ color: '#b91c1c' }}>
            {overdue.length} course{overdue.length === 1 ? '' : 's'} overdue
          </p>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', margin: '8px 0 14px', lineHeight: 1.6 }}>
            The following required training is past its due date. Please complete it as soon as possible.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {overdue.map((c) => (
              <a key={c.slug} href={`/training/${c.slug}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', textDecoration: 'none', padding: '10px 12px', border: '1px solid var(--smoke)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--charcoal)' }}>{c.title}</span>
                <span style={{ fontSize: '0.74rem', color: '#b91c1c', fontWeight: 600, whiteSpace: 'nowrap' }}>Due {c.dueAt ? fmtDate(c.dueAt) : ''} →</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Due soon nudge */}
      {soon.length > 0 && (
        <div className="dash-card" style={{ borderLeft: '3px solid var(--gold)' }}>
          <p className="dash-card-title" style={{ color: 'var(--gold)' }}>Due soon</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {soon.map((c) => (
              <a key={c.slug} href={`/training/${c.slug}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--charcoal)' }}>{c.title}</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Due {c.dueAt ? fmtDate(c.dueAt) : ''} →</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Training snapshot */}
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <StatCard value={total} label="Assigned courses" />
          <StatCard value={done} label="Completed" tone="green" />
          <StatCard value={incomplete.length} label="In progress / to do" />
          <StatCard value={overdue.length} label="Overdue" tone={overdue.length > 0 ? 'red' : 'green'} />
        </div>
      )}

      {/* Continue learning */}
      {nextCourse && (
        <a href={`/training/${nextCourse.slug}`} className="dash-card" style={{ display: 'block', textDecoration: 'none', borderLeft: '3px solid var(--gold)' }}>
          <p className="dash-card-title" style={{ marginBottom: '6px' }}>{nextCourse.progressPct > 0 ? 'Continue learning' : 'Start your training'} →</p>
          <p style={{ fontSize: '0.95rem', color: 'var(--charcoal)', fontWeight: 600 }}>{nextCourse.title}</p>
          {nextCourse.lessonCount > 0 && (
            <div style={{ marginTop: '10px', maxWidth: '320px' }}>
              <div style={{ height: '4px', background: 'var(--smoke)', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${nextCourse.progressPct}%`, background: 'var(--gold)', borderRadius: '2px' }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                {nextCourse.lessonsDone} of {nextCourse.lessonCount} lessons
              </span>
            </div>
          )}
        </a>
      )}

      <ComplianceChecklist agent={agent} trainingDone={trainingDone} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '4px' }}>
        <QuickLink href="/training" title="Training & Courses" desc="Take your assigned courses and complete the quizzes." />
        <QuickLink href="/resources" title="Resources" desc="Reference documents, forms, and compliance materials." />
        <QuickLink href="/settings" title="Account Settings" desc="View your account details and change your password." />
      </div>
    </div>
  );
}
