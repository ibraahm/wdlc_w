'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { changePasswordAction } from '@/lib/actions';
import type { Agent } from '@/lib/api';

// ---- Submit Button ----

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex justify-center py-2.5 px-5 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Updating…' : 'Update password'}
    </button>
  );
}

// ---- Status Badge ----

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 border-green-200',
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    SUSPENDED: 'bg-red-100 text-red-800 border-red-200',
  };
  const cls = styles[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}
    >
      {status}
    </span>
  );
}

// ---- Change Password Form ----

function ChangePasswordForm() {
  const [state, action] = useFormState(changePasswordAction, null);
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Change password</h2>
      <p className="text-sm text-gray-500 mb-5">
        Update your account password. You&apos;ll need your current password.
      </p>

      {state?.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Password updated successfully.
        </div>
      )}

      <form action={action} onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Current password
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="••••••••••"
          />
        </div>

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
          <label
            htmlFor="confirmNewPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirm new password
          </label>
          <input
            id="confirmNewPassword"
            name="confirmNewPassword"
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
          {confirmError && <p className="mt-1 text-xs text-red-600">{confirmError}</p>}
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}

// ---- Main Dashboard Client ----

export default function DashboardClient({ agent }: { agent: Agent }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {agent.firstName}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your agent account and security settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* Account info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Account information</h2>
          <dl className="space-y-0 divide-y divide-gray-100">
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="text-sm font-medium text-gray-900">
                {agent.firstName} {agent.lastName}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-medium text-gray-900">{agent.email}</dd>
            </div>
            {agent.phone && (
              <div className="flex items-center justify-between py-3">
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-sm font-medium text-gray-900">{agent.phone}</dd>
              </div>
            )}
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-gray-500">Account status</dt>
              <dd>
                <StatusBadge status={agent.status} />
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-gray-500">Email verified</dt>
              <dd>
                {agent.emailVerified ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-700">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Not verified
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Change password */}
        <ChangePasswordForm />
      </div>
    </div>
  );
}
