'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { adminLoginAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="auth-submit">
      {pending ? 'Signing in…' : 'Sign In'}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, action] = useFormState(adminLoginAction, null);

  return (
    <>
      <p className="auth-title">Admin access</p>
      <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b', marginBottom: '20px' }}>
        Sign in with your World Direct Link admin credentials.
      </p>

      {state?.error && <div className="auth-error" style={{ marginBottom: '20px' }}>{state.error}</div>}

      <form action={action} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Admin email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="auth-input" placeholder="admin@worlddirectlink.com" />
        </div>

        <div className="auth-field">
          <label htmlFor="password" className="auth-label">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="auth-input" placeholder="••••••••••" />
        </div>

        <SubmitButton />
      </form>

      <p className="auth-footer">
        Agent?{' '}
        <Link href="/login" className="auth-link">Sign in to your agent account</Link>
      </p>
    </>
  );
}
