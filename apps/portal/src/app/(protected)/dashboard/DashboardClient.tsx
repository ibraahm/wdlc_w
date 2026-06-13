'use client';

import type { Agent } from '@/lib/api';

function ComplianceChecklist({ agent }: { agent: Agent }) {
  const steps = [
    { label: 'Account created', done: true },
    { label: 'Email verified', done: agent.emailVerified },
    { label: 'Account approved by World Direct Link', done: agent.status === 'ACTIVE' },
    { label: 'Review compliance materials (coming soon)', done: false },
    { label: 'Complete BSA/AML training (coming soon)', done: false },
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

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a href={href} className="dash-card" style={{ display: 'block', textDecoration: 'none' }}>
      <p className="dash-card-title" style={{ marginBottom: '6px' }}>{title} →</p>
      <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</p>
    </a>
  );
}

export default function DashboardClient({ agent }: { agent: Agent }) {
  return (
    <div className="portal-content">
      <div className="dash-eyebrow">Agent Portal</div>
      <h1 className="dash-title">Welcome back, {agent.firstName}</h1>

      {agent.status === 'PENDING' && (
        <div className="dash-card" style={{ borderLeft: '3px solid var(--gold)' }}>
          <p className="dash-card-title" style={{ color: 'var(--gold)' }}>Application Under Review</p>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
            Your agent application is pending approval by the World Direct Link compliance team.
            You will receive an email once your account has been reviewed. This typically takes 2–5 business days.
          </p>
        </div>
      )}

      <ComplianceChecklist agent={agent} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '4px' }}>
        <QuickLink href="/settings" title="Account Settings" desc="View your account details and change your password." />
      </div>
    </div>
  );
}
