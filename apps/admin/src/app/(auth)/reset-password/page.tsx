'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { resetPasswordAction } from '@/lib/actions';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    formData.set('token', token);
    startTransition(async () => {
      const result = await resetPasswordAction(formData);
      if (result.ok) {
        setSuccess(true);
      } else {
        setError(result.error ?? 'Reset failed');
      }
    });
  }

  if (!token) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div className="auth-error" style={{ marginBottom: '20px' }}>Invalid or missing reset token.</div>
        <Link href="/forgot-password" className="auth-link" style={{ fontSize: '0.82rem' }}>Request a new link</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div className="auth-success" style={{ marginBottom: '20px' }}>Password updated successfully.</div>
        <Link href="/login" className="auth-link" style={{ fontSize: '0.82rem' }}>Sign in</Link>
      </div>
    );
  }

  return (
    <>
      <p className="auth-title">Set new password</p>

      {error && <div className="auth-error" style={{ marginBottom: '20px' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <input type="hidden" name="token" value={token} />
        <div className="auth-field">
          <label htmlFor="newPassword" className="auth-label">New password</label>
          <input id="newPassword" name="newPassword" type="password" required minLength={8} className="auth-input" placeholder="••••••••" />
        </div>
        <div className="auth-field">
          <label htmlFor="confirmPassword" className="auth-label">Confirm new password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} className="auth-input" placeholder="••••••••" />
        </div>
        <button type="submit" disabled={isPending} className="auth-submit">
          {isPending ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.88rem', padding: '24px 0' }}>Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
