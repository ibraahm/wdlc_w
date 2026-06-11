import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListNetworkCountries, type NetworkCountry } from '@/lib/api';
import NetworkManager from '@/components/NetworkManager';

export default async function NetworkPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let countries: NetworkCountry[] = [];
  let error = '';

  try {
    countries = await apiListNetworkCountries(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load network countries';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Network Map Countries</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the payout destinations shown on the interactive global network map.
          Each country can have one or more payout types (Cash Collection, Mobile Money, Bank Transfer).
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <NetworkManager countries={countries} />
      )}
    </div>
  );
}
