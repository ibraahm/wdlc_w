'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { changePasswordAction } from '@/lib/actions';

export default function ChangePasswordClient() {
  const router = useRouter();
  const [state, action] = useFormState(changePasswordAction, null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');

  // On success the action has already rotated the session cookies (clearing the
  // forced-change flag), so we can move on to the portal.
  useEffect(() => {
    if (state?.ok) { router.replace('/dashboard'); router.refresh(); }
  }, [state, router]);

  function handleSubmit(e: React.FormEvent) {
    setConfirmError('');
    if (newPassword !== confirmPassword) {
      e.preventDefault();
      setConfirmError('The new passwords do not match.');
    }
  }

  return (
    <div className="portal-content" style={{ maxWidth: 540 }}>
      <h1 className="dash-title">Set your password</h1>
      <p style={{ fontSize: '1rem', color: 'var(--charcoal)', lineHeight: 1.6, margin: '0 0 20px' }}>
        For your security, please choose your own password before continuing. Enter the temporary
        password you were given, then pick a new one.
      </p>
      <div className="dash-card">
        {state?.error && <div className="auth-error" style={{ marginBottom: 16 }}>{state.error}</div>}
        <form action={action} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="auth-field">
            <label htmlFor="currentPassword" className="auth-label">Temporary password</label>
            <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className="auth-input" placeholder="The password you were given" />
          </div>
          <div className="auth-field">
            <label htmlFor="newPassword" className="auth-label">New password</label>
            <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="auth-input" placeholder="At least 10 characters" />
          </div>
          <div className="auth-field">
            <label htmlFor="confirmNewPassword" className="auth-label">Confirm new password</label>
            <input id="confirmNewPassword" name="confirmNewPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="auth-input" placeholder="Re-enter your new password" />
            {confirmError && <span style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: 4 }}>{confirmError}</span>}
          </div>
          <button type="submit" className="auth-submit" style={{ width: 'auto', padding: '14px 28px' }}>Save new password</button>
        </form>
      </div>
    </div>
  );
}
