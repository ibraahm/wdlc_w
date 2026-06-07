import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListAgents, type AdminAgent } from '@/lib/api';
import AgentsManager from '@/components/AgentsManager';

export default async function AgentsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let agents: AdminAgent[] = [];
  let error = '';
  try {
    agents = await apiListAgents(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load agents';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review agent accounts and control which appear on the public Find an Agent map.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <AgentsManager agents={agents} />
      )}
    </div>
  );
}
