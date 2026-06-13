import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const forced = !!session.user.mustChangePassword;

  return (
    <div className="max-w-md mx-auto mt-10 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {forced ? 'Set a new password' : 'Change password'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {forced
            ? 'For your security, you must choose your own password before continuing.'
            : 'Update the password for your admin account.'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ChangePasswordForm redirectTo="/dashboard" compact />
      </div>
    </div>
  );
}
