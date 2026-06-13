import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListBranches, type AgentBranch } from '@/lib/api';
import BranchesView from '@/components/BranchesView';

export const dynamic = 'force-dynamic';

export default async function BranchesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let branches: AgentBranch[] = [];
  let error = '';
  try {
    branches = await apiListBranches(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load active agents';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Agents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Live and on-hold agent branches by branch code, with the portal users (principals and
          tellers) assigned to each. Branches due for periodic review are flagged for revisit.
        </p>
      </div>
      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <BranchesView branches={branches} />
      )}
    </div>
  );
}
