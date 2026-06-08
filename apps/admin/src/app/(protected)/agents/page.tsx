import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListAgents, apiListLocations, type AdminAgent, type AdminLocation } from '@/lib/api';
import AgentsManager from '@/components/AgentsManager';

export default async function AgentsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let agents: AdminAgent[] = [];
  let locations: AdminLocation[] = [];
  let error = '';

  try {
    [agents, locations] = await Promise.all([
      apiListAgents(session.accessToken),
      apiListLocations(session.accessToken),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load agents';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Locations</h1>
        <p className="text-sm text-gray-500 mt-1">
          One list for the public map — add locations manually or import from Excel, then edit any entry.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <AgentsManager agents={agents} locations={locations} accessToken={session.accessToken} />
      )}
    </div>
  );
}
