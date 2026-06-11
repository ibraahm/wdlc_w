import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListLocations, type AdminLocation } from '@/lib/api';
import AgentsManager from '@/components/AgentsManager';
import OnboardingFlow from '@/components/OnboardingFlow';

export default async function AgentsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let locations: AdminLocation[] = [];
  let error = '';

  try {
    locations = await apiListLocations(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load locations';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Agent Locations</h1>
        <p className="admin-section-subtitle">
          Manage the locations shown on the public map. Add entries manually, import a CSV or Excel file, then keep status and coordinates current.
        </p>
      </div>

      <OnboardingFlow active="locations" />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <AgentsManager locations={locations} accessToken={session.accessToken} />
      )}
    </div>
  );
}
