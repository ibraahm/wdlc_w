import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListTellerApplications, type TellerApplication } from '@/lib/api';
import TellersManager from '@/components/TellersManager';

export const dynamic = 'force-dynamic';

export default async function TellersPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let items: TellerApplication[] = [];
  let error = '';
  try {
    items = await apiListTellerApplications(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load teller applications';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teller Applications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Branch employees applying to work under an existing agent. Verify the branch code
          (correct it if needed), complete the background check, then approve - approval emails
          the teller a one-time portal setup link.
        </p>
      </div>
      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <TellersManager items={items} />
      )}
    </div>
  );
}
