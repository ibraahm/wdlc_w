'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { loginAction } from '@/lib/actions';
import MathChallengeField from '@/components/MathChallengeField';
import GoogleSignInButton from '@/components/GoogleSignInButton';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="auth-submit">
      {pending ? 'Signing in…' : 'Sign In'}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, null);

  return (
    <>
      <p className="auth-title">Sign in to your account</p>

      {state?.error && <div className="auth-error" style={{ marginBottom: '20px' }}>{state.error}</div>}

      <GoogleSignInButton />

      <form action={action} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="auth-input" placeholder="you@example.com" />
        </div>

        <div className="auth-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="password" className="auth-label">Password</label>
            <Link href="/forgot-password" className="auth-link" style={{ fontSize: '0.72rem' }}>Forgot password?</Link>
          </div>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="auth-input" placeholder="••••••••••" />
        </div>

        <MathChallengeField context="portal_login" />
        <SubmitButton />
      </form>

      <p className="auth-footer">
        Portal access is issued by World Direct Link when your agent or teller
        application is approved.
      </p>
    </>
  );
}
