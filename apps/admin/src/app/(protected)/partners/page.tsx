import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListPartners, type Partner } from '@/lib/api';
import PartnersManager from '@/components/PartnersManager';

export default async function PartnersPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let partners: Partner[] = [];
  let error = '';

  try {
    partners = await apiListPartners(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load partners';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage correspondent, banking, and technology partners shown on the public
          Partners page. Changes take effect immediately.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <PartnersManager partners={partners} />
      )}
    </div>
  );
}
