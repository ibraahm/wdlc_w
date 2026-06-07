import { getSession } from '@/lib/auth';
import { apiGetSettings } from '@/lib/api';
import { redirect } from 'next/navigation';
import SettingsManager from '@/components/SettingsManager';

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
        <p className="text-gray-500 text-sm mt-1">Manage site-wide configuration.</p>
      </div>

      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      <SettingsManager initialSettings={settings} />
    </div>
  );
}
