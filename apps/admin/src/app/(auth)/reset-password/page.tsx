'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { resetPasswordAction } from '@/lib/actions';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    formData.set('token', token);
    startTransition(async () => {
      const result = await resetPasswordAction(formData);
      if (result.ok) {
        setSuccess(true);
      } else {
        setError(result.error ?? 'Reset failed');
      }
    });
  }

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500 mb-4">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-green-600 text-xl">✓</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Password updated</h2>
        <p className="text-sm text-gray-500 mb-6">Your password has been reset successfully.</p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Set new password</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-primary text-white font-medium rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
