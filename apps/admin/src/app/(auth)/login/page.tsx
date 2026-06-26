'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { loginAction } from '@/lib/actions';
import MathChallengeField from '@/components/MathChallengeField';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [stage, setStage] = useState<'creds' | 'mfa'>('creds');
  const [creds, setCreds] = useState({ email: '', password: '' });

  function submitCreds(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    setCreds({ email: formData.get('email') as string, password: formData.get('password') as string });
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.mfaRequired) { setStage('mfa'); return; }
      if (result?.error) setError(result.error);
    });
  }

  function submitMfa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.mfaRequired) { setError('That code was not accepted. Please try again.'); return; }
      if (result?.error) setError(result.error);
    });
  }

  if (stage === 'mfa') {
    return (
      <>
        <p className="auth-title">Two-factor verification</p>
        <p style={{ marginBottom: 20, fontSize: '0.85rem', color: '#64748b' }}>
          Enter the 6-digit code from your authenticator app.
        </p>
        {error && <div className="auth-error" style={{ marginBottom: '20px' }}>{error}</div>}
        <form onSubmit={submitMfa} className="auth-form">
          <input type="hidden" name="email" value={creds.email} />
          <input type="hidden" name="password" value={creds.password} />
          <div className="auth-field">
            <label htmlFor="code" className="auth-label">Authenticator code</label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              className="auth-input"
              placeholder="123456"
            />
          </div>
          <MathChallengeField context="admin_login" />
          <button type="submit" disabled={isPending} className="auth-submit">
            {isPending ? 'Verifying…' : 'Verify'}
          </button>
        </form>
        <p className="auth-footer">
          <button type="button" className="auth-link" onClick={() => { setStage('creds'); setError(''); }} style={{ background: 'none', border: 0, cursor: 'pointer' }}>
            Back to sign in
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <p className="auth-title">Sign in to Admin</p>

      {error && <div className="auth-error" style={{ marginBottom: '20px' }}>{error}</div>}

      <GoogleSignInButton />

      <form onSubmit={submitCreds} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="auth-input" placeholder="name@worlddirectlink.com" />
        </div>
        <div className="auth-field">
          <label htmlFor="password" className="auth-label">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="auth-input" placeholder="••••••••" />
        </div>
        <MathChallengeField context="admin_login" />
        <button type="submit" disabled={isPending} className="auth-submit">
          {isPending ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="auth-footer">
        <Link href="/forgot-password" className="auth-link">Forgot password?</Link>
      </p>
    </>
  );
}
