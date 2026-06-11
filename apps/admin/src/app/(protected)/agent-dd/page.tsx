import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListDDFiles, apiDDDashboard, type DDFile, type DDDashboard } from '@/lib/api';
import DDFilesManager from '@/components/DDFilesManager';
import OnboardingFlow from '@/components/OnboardingFlow';

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
        <h1 className="admin-page-title">Due Diligence</h1>
        <p className="admin-section-subtitle">
          Track each agent file from onboarding through ongoing review, including checklist status, risk, expiries, and next review dates.
        </p>
      </div>

      <OnboardingFlow active="dd" />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <DDFilesManager initialFiles={files} dashboard={dashboard} />
      )}
    </div>
  );
}
