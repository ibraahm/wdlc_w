import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListApplications, type AgentApplication } from '@/lib/api';
import ApplicationsManager from '@/components/ApplicationsManager';

export default async function ApplicationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let applications: AgentApplication[] = [];
  let error = '';

  try {
    applications = await apiListApplications(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load applications';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Applications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Submissions from the public &ldquo;Become an Agent&rdquo; form.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <ApplicationsManager applications={applications} />
      )}
    </div>
  );
}
