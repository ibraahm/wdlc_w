'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changePasswordAction } from '@/lib/actions';

export default function ChangePasswordForm({
  redirectTo,
  compact = false,
}: {
  /** Where to send the user after a successful change (e.g. '/dashboard'). */
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    if ((fd.get('newPassword') as string) !== (fd.get('confirmPassword') as string)) {
      setError('New passwords do not match.');
      return;
    }
    start(async () => {
      const res = await changePasswordAction(fd);
      if (res.ok) {
        setDone(true);
        formRef.current?.reset();
        if (redirectTo) {
          router.replace(redirectTo);
          router.refresh();
        }
      } else {
        setError(res.error ?? 'Change failed');
      }
    });
  }

  const input =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Current password</label>
        <input name="currentPassword" type="password" required autoComplete="current-password" className={input} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">New password</label>
        <input name="newPassword" type="password" required minLength={12} autoComplete="new-password" className={input} />
        <p className="text-[11px] text-gray-400 mt-1">At least 12 characters.</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Confirm new password</label>
        <input name="confirmPassword" type="password" required minLength={12} autoComplete="new-password" className={input} />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      {done && !redirectTo && <p className="text-green-600 text-xs">Password changed.</p>}
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Changing…' : compact ? 'Change password' : 'Update password'}
      </button>
    </form>
  );
}
