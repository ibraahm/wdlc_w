import { getSession } from '@/lib/auth';
import { apiGetSettings, apiGetSystemStatus, type SystemStatus } from '@/lib/api';
import { redirect } from 'next/navigation';
import SettingsManager from '@/components/SettingsManager';
import AnnouncementSettings, { type AnnouncementConfig } from '@/components/AnnouncementSettings';
import SystemStatusBoard from '@/components/SystemStatusBoard';
import IntegrationsSettings from '@/components/IntegrationsSettings';
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

  // The announcement is edited in its own panel; parse its JSON value and keep
  // it out of the raw key/value list below.
  let announcement: Partial<AnnouncementConfig> | null = null;
  const annRow = settings.find((s) => s.key === 'announcement');
  if (annRow) {
    try {
      let parsed: unknown = JSON.parse(annRow.value);
      // Tolerate a legacy double-encoded value (a JSON string of JSON).
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (parsed && typeof parsed === 'object') announcement = parsed as Partial<AnnouncementConfig>;
    } catch {
      announcement = null;
    }
  }
  const otherSettings = settings.filter((s) => s.key !== 'announcement' && s.key !== 'docusign.enabled');

  // DocuSign on/off (default on when unset).
  const dsRow = settings.find((s) => s.key === 'docusign.enabled');
  let docusignEnabled = true;
  if (dsRow) {
    try {
      let v: unknown = JSON.parse(dsRow.value);
      if (typeof v === 'string') v = JSON.parse(v);
      docusignEnabled = v !== false;
    } catch {
      docusignEnabled = true;
    }
  }
  const canManage = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER'].includes(session.user.role);

  // System/integration health is SUPER_ADMIN-only and never includes secrets.
  let systemStatus: SystemStatus | null = null;
  if (session.user.role === 'SUPER_ADMIN') {
    try {
      systemStatus = await apiGetSystemStatus(session.accessToken);
    } catch {
      systemStatus = null;
    }
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

      {systemStatus && <SystemStatusBoard status={systemStatus} />}

      {canManage && <IntegrationsSettings docusignEnabled={docusignEnabled} />}

      <AnnouncementSettings initial={announcement} />

      <SettingsManager initialSettings={otherSettings} />

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
