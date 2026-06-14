import { getSession } from '@/lib/auth';
import { apiGetSettings } from '@/lib/api';
import { redirect } from 'next/navigation';
import SettingsManager from '@/components/SettingsManager';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let settings: Awaited<ReturnType<typeof apiGetSettings>> = [];
  let fetchError = '';

  try {
    settings = await apiGetSettings(session.accessToken);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load settings';
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage site-wide configuration and your account.</p>
      </div>

      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      <SettingsManager initialSettings={settings} />

      {/* Your account - change password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-1">Your password</h2>
        <p className="text-xs text-gray-500 mb-4">
          Signed in as {session.user.email}. Choose a strong password you don&apos;t use elsewhere.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
