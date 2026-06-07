import { getSession } from '@/lib/auth';
import { apiGetNav } from '@/lib/api';
import { redirect } from 'next/navigation';
import NavManager from '@/components/NavManager';

export default async function NavPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let navItems: Awaited<ReturnType<typeof apiGetNav>> = [];
  let fetchError = '';

  try {
    navItems = await apiGetNav(session.accessToken);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load nav items';
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Navigation</h1>
        <p className="text-gray-500 text-sm mt-1">Manage site navigation items.</p>
      </div>

      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      <NavManager initialItems={navItems} />
    </div>
  );
}
