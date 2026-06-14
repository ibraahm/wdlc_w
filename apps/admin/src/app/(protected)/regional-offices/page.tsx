import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListRegionalOffices, type RegionalOffice } from '@/lib/api';
import RegionalOfficesManager from '@/components/RegionalOfficesManager';

export const dynamic = 'force-dynamic';

export default async function RegionalOfficesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const canManage = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(session.user.role);

  let offices: RegionalOffice[] = [];
  let error = '';
  try {
    offices = await apiListRegionalOffices(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load regional offices';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Regional Offices</h1>
        <p className="admin-page-sub">
          Define offices and the states each one covers. Agents are automatically assigned to the
          office that covers their state when their due-diligence file is opened.
        </p>
      </div>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <RegionalOfficesManager offices={offices} canManage={canManage} />
      )}
    </div>
  );
}
