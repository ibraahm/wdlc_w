'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { loginAction } from '@/lib/actions';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <p className="auth-title">Sign in to Admin</p>

      {error && <div className="auth-error" style={{ marginBottom: '20px' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="auth-input" placeholder="admin@wdlc.com" />
        </div>
        <div className="auth-field">
          <label htmlFor="password" className="auth-label">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="auth-input" placeholder="••••••••" />
        </div>
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
