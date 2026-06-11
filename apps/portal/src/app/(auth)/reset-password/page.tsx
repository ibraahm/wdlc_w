'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import Link from 'next/link';
import { resetPasswordAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="auth-submit">
      {pending ? 'Resetting…' : 'Reset Password'}
    </button>
  );
}

interface Props {
  searchParams: { token?: string };
}

export default function ResetPasswordPage({ searchParams }: Props) {
  const token = searchParams.token ?? '';
  const [state, action] = useFormState(resetPasswordAction, null);
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

  if (!token) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div className="auth-error" style={{ marginBottom: '20px' }}>Invalid or missing reset token. Please request a new link.</div>
        <Link href="/forgot-password" className="auth-link" style={{ fontSize: '0.82rem' }}>Request new link</Link>
      </div>
    );
  }

  if (state?.ok) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div className="auth-success" style={{ marginBottom: '20px' }}>Password reset successfully. You can now sign in.</div>
        <Link href="/login" className="auth-submit" style={{ display: 'inline-block', textDecoration: 'none', padding: '12px 28px' }}>Sign In</Link>
      </div>
    );
  }

  return (
    <>
      <p className="auth-title">Set new password</p>

      {state?.error && <div className="auth-error" style={{ marginBottom: '20px' }}>{state.error}</div>}

      <form action={action} onSubmit={handleSubmit} className="auth-form">
        <input type="hidden" name="token" value={token} />
        <div className="auth-field">
          <label htmlFor="newPassword" className="auth-label">New password</label>
          <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="auth-input" placeholder="Min 10 characters" />
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px' }}>Uppercase, lowercase, number, and special character required.</span>
        </div>
        <div className="auth-field">
          <label htmlFor="confirmPassword" className="auth-label">Confirm new password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="auth-input" placeholder="••••••••••" />
          {confirmError && <span style={{ fontSize: '0.72rem', color: '#7f1d1d', marginTop: '4px' }}>{confirmError}</span>}
        </div>
        <SubmitButton />
      </form>
    </>
  );
}
