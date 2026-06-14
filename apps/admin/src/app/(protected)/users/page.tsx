import { getSession } from '@/lib/auth';
import { apiListUsers, apiListRegionalOffices, type RegionalOffice } from '@/lib/api';
import { redirect } from 'next/navigation';
import UsersManager from '@/components/UsersManager';

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">⊘</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">
            Only Super Admins can manage users. Your role: {session.user.role}
          </p>
        </div>
      </div>
    );
  }

  let users: Awaited<ReturnType<typeof apiListUsers>> = [];
  let offices: RegionalOffice[] = [];
  let fetchError = '';

  try {
    [users, offices] = await Promise.all([
      apiListUsers(session.accessToken),
      apiListRegionalOffices(session.accessToken).catch(() => []),
    ]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load users';
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 text-sm mt-1">Manage admin team members.</p>
      </div>

      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      <UsersManager initialUsers={users} offices={offices} />
    </div>
  );
}
