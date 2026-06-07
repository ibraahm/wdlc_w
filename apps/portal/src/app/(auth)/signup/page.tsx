'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import Link from 'next/link';
import { signupAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="auth-submit">
      {pending ? 'Creating account…' : 'Create Account'}
    </button>
  );
}

export default function SignupPage() {
  const [state, action] = useFormState(signupAction, null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (password !== confirmPassword) {
      e.preventDefault();
      setConfirmError('Passwords do not match.');
    } else {
      setConfirmError('');
    }
  }

  if (state?.ok) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div className="auth-success" style={{ marginBottom: '24px' }}>
          {state.message || 'Account created. Check your email to verify.'}
        </div>
        <Link href="/login" className="auth-link" style={{ fontSize: '0.82rem' }}>Back to sign in</Link>
      </div>
    );
  }

  return (
    <>
      <p className="auth-title">Create your account</p>

      {state?.error && <div className="auth-error" style={{ marginBottom: '20px' }}>{state.error}</div>}

      <form action={action} onSubmit={handleSubmit} className="auth-form">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="auth-field">
            <label htmlFor="firstName" className="auth-label">First name</label>
            <input id="firstName" name="firstName" type="text" autoComplete="given-name" required className="auth-input" placeholder="Jane" />
          </div>
          <div className="auth-field">
            <label htmlFor="lastName" className="auth-label">Last name</label>
            <input id="lastName" name="lastName" type="text" autoComplete="family-name" required className="auth-input" placeholder="Smith" />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="auth-input" placeholder="you@example.com" />
        </div>

        <div className="auth-field">
          <label htmlFor="phone" className="auth-label">Phone <span style={{ color: 'var(--muted)', fontWeight: 300, letterSpacing: 0 }}>(optional)</span></label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className="auth-input" placeholder="+1 (555) 000-0000" />
        </div>

        <div className="auth-field">
          <label htmlFor="password" className="auth-label">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" placeholder="Min 10 characters" />
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px' }}>Uppercase, lowercase, number, and special character required.</span>
        </div>

        <div className="auth-field">
          <label htmlFor="confirmPassword" className="auth-label">Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="auth-input" placeholder="••••••••••" />
          {confirmError && <span style={{ fontSize: '0.72rem', color: '#7f1d1d', marginTop: '4px' }}>{confirmError}</span>}
        </div>

        <SubmitButton />
      </form>

      <p className="auth-footer">
        Already have an account?{' '}
        <Link href="/login" className="auth-link">Sign in</Link>
      </p>
    </>
  );
}
