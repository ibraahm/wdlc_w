'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { forgotPasswordAction } from '@/lib/actions';
import MathChallengeField from '@/components/MathChallengeField';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await forgotPasswordAction(formData);
      if (result.ok) {
        setSent(true);
      } else {
        setError(result.error ?? 'Something went wrong');
      }
    });
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div className="auth-success" style={{ marginBottom: '20px' }}>If an account exists, reset instructions have been sent.</div>
        <Link href="/login" className="auth-link" style={{ fontSize: '0.82rem' }}>Back to sign in</Link>
      </div>
    );
  }

  return (
    <>
      <p className="auth-title">Reset your password</p>

      {error && <div className="auth-error" style={{ marginBottom: '20px' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email address</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="auth-input" placeholder="admin@wdlc.com" />
        </div>
        <MathChallengeField context="admin_forgot_password" />
        <button type="submit" disabled={isPending} className="auth-submit">
          {isPending ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <p className="auth-footer">
        <Link href="/login" className="auth-link">Back to sign in</Link>
      </p>
    </>
  );
}
