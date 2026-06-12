'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { forgotPasswordAction } from '@/lib/actions';
import MathChallengeField from '@/components/MathChallengeField';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="auth-submit">
      {pending ? 'Sending…' : 'Send Reset Link'}
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [state, action] = useFormState(forgotPasswordAction, null);

  if (state?.ok) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div className="auth-success" style={{ marginBottom: '24px' }}>
          If an account exists for that email, a reset link has been sent.
        </div>
        <Link href="/login" className="auth-link" style={{ fontSize: '0.82rem' }}>Back to sign in</Link>
      </div>
    );
  }

  return (
    <>
      <p className="auth-title">Reset your password</p>
      <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '-16px', marginBottom: '24px', lineHeight: 1.7 }}>
        Enter your email and we&apos;ll send a reset link.
      </p>

      {state?.error && <div className="auth-error" style={{ marginBottom: '20px' }}>{state.error}</div>}

      <form action={action} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="auth-input" placeholder="you@example.com" />
        </div>
        <MathChallengeField context="portal_forgot_password" />
        <SubmitButton />
      </form>

      <p className="auth-footer">
        Remember your password?{' '}
        <Link href="/login" className="auth-link">Sign in</Link>
      </p>
    </>
  );
}
