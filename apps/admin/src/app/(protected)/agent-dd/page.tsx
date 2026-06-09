import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListDDFiles, apiDDDashboard, type DDFile, type DDDashboard } from '@/lib/api';
import DDFilesManager from '@/components/DDFilesManager';

export default async function AgentDDPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let files: DDFile[] = [];
  let dashboard: DDDashboard | null = null;
  let error = '';

  try {
    [files, dashboard] = await Promise.all([
      apiListDDFiles(session.accessToken),
      apiDDDashboard(session.accessToken),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load due-diligence files';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Due Diligence</h1>
        <p className="text-sm text-gray-500 mt-1">
          Onboarding and ongoing DD per the Agent Due Diligence File Checklist. Documents are stored in
          Dropbox; this register tracks presence, expiry, status, risk, and the review cycle.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <DDFilesManager initialFiles={files} dashboard={dashboard} />
      )}
    </div>
  );
}
