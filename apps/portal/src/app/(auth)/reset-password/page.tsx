'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import Link from 'next/link';
import { resetPasswordAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Resetting…' : 'Reset password'}
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
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid link</h2>
        <p className="text-sm text-gray-600 mb-6">
          This password reset link is missing a token. Please request a new one.
        </p>
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Request new link
        </Link>
      </div>
    );
  }

  if (state?.ok) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Password reset</h2>
        <p className="text-sm text-gray-600 mb-6">
          Password reset — you can now sign in.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Set new password</h2>
      <p className="text-sm text-gray-500 mb-6">
        Choose a strong password for your account.
      </p>

      {state?.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form action={action} onSubmit={handleSubmit} className="space-y-5">
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Min 10 characters"
          />
          <p className="mt-1 text-xs text-gray-400">
            Must include uppercase, lowercase, number, and special character.
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`block w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
              confirmError
                ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
            placeholder="••••••••••"
          />
          {confirmError && (
            <p className="mt-1 text-xs text-red-600">{confirmError}</p>
          )}
        </div>

        <SubmitButton />
      </form>
    </>
  );
}
