import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListTrainingResources, type Resource } from '@/lib/api';
import ResourcesManager from '@/components/ResourcesManager';

export const dynamic = 'force-dynamic';

export default async function TrainingResourcesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let resources: Resource[] = [];
  let error = '';
  try {
    resources = await apiListTrainingResources(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load resources';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resource Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reference documents and links for agents and tellers, with the same targeting as courses
          (everyone, by state, or by agent). Portal users acknowledge each resource - an auditable
          record that they opened it.
        </p>
      </div>
      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <ResourcesManager resources={resources} />
      )}
    </div>
  );
}
