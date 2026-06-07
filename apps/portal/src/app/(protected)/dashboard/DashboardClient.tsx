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
      <div className="dash-eyebrow">Account Overview</div>
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

      <ChangePasswordForm />
    </div>
  );
}
