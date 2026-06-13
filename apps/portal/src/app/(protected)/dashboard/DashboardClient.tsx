'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { changePasswordAction } from '@/lib/actions';
import type { Agent } from '@/lib/api';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="auth-submit" style={{ width: 'auto', padding: '12px 28px' }}>
      {pending ? 'Updating…' : 'Update Password'}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'ACTIVE' ? 'status-active' : status === 'PENDING' ? 'status-pending' : 'status-suspended';
  return <span className={cls}>{status}</span>;
}

function ComplianceChecklist({ agent }: { agent: Agent }) {
  const steps = [
    { label: 'Account created', done: true },
    { label: 'Email verified', done: agent.emailVerified },
    { label: 'Account approved by World Direct Link', done: agent.status === 'ACTIVE' },
    { label: 'Review compliance materials', done: false, link: '/compliance' },
    { label: 'Complete BSA/AML training', done: false },
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
            <span style={{ fontSize: '0.84rem', color: step.done ? 'var(--charcoal)' : 'var(--muted)', textDecoration: step.done ? 'none' : 'none' }}>
              {step.link && !step.done
                ? <a href={step.link} style={{ color: 'var(--gold)' }}>{step.label}</a>
                : step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const [state, action] = useFormState(changePasswordAction, null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (newPassword !== confirmPassword) {
      e.preventDefault();
      setConfirmError('Passwords do not match.');
    } else {
      setConfirmError('');
    }
  }

  return (
    <div className="dash-card">
      <p className="dash-card-title">Change Password</p>
      {state?.error && <div className="auth-error" style={{ marginBottom: '20px' }}>{state.error}</div>}
      {state?.ok && <div className="auth-success" style={{ marginBottom: '20px' }}>Password updated successfully.</div>}
      <form action={action} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '380px' }}>
        <div className="auth-field">
          <label htmlFor="currentPassword" className="auth-label">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className="auth-input" placeholder="••••••••••" />
        </div>
        <div className="auth-field">
          <label htmlFor="newPassword" className="auth-label">New password</label>
          <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="auth-input" placeholder="Min 10 characters" />
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px' }}>Uppercase, lowercase, number, and special character required.</span>
        </div>
        <div className="auth-field">
          <label htmlFor="confirmNewPassword" className="auth-label">Confirm new password</label>
          <input id="confirmNewPassword" name="confirmNewPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="auth-input" placeholder="••••••••••" />
          {confirmError && <span style={{ fontSize: '0.72rem', color: '#7f1d1d', marginTop: '4px' }}>{confirmError}</span>}
        </div>
        <div><SubmitButton /></div>
      </form>
    </div>
  );
}

export default function DashboardClient({ agent }: { agent: Agent }) {
  return (
    <div className="portal-content">
      <div className="dash-eyebrow">Agent Dashboard</div>
      <h1 className="dash-title">Welcome back, {agent.firstName}</h1>

      <div className="dash-card">
        <p className="dash-card-title">Account Information</p>
        <div className="dash-row">
          <span className="dash-row-label">Name</span>
          <span className="dash-row-value">{agent.firstName} {agent.lastName}</span>
        </div>
        <div className="dash-row">
          <span className="dash-row-label">Email</span>
          <span className="dash-row-value">{agent.email}</span>
        </div>
        {agent.phone && (
          <div className="dash-row">
            <span className="dash-row-label">Phone</span>
            <span className="dash-row-value">{agent.phone}</span>
          </div>
        )}
        <div className="dash-row">
          <span className="dash-row-label">Account status</span>
          <StatusBadge status={agent.status} />
        </div>
        <div className="dash-row">
          <span className="dash-row-label">Email verified</span>
          <span className="dash-row-value" style={{ color: agent.emailVerified ? '#166534' : '#92400e' }}>
            {agent.emailVerified ? '✓ Verified' : '⚠ Not verified'}
          </span>
        </div>
      </div>

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

      <ChangePasswordForm />
    </div>
  );
}
