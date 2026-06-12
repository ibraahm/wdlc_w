import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListNav, type NavItem } from '@/lib/api';
import NavigationManager from '@/components/NavigationManager';

export const dynamic = 'force-dynamic';

export default async function NavigationPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let items: NavItem[] = [];
  let error = '';
  try {
    items = await apiListNav(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load navigation';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Navigation &amp; Menus</h1>
        <p className="text-sm text-gray-500 mt-1">
          Edit the public site&apos;s header menu, utility bar, and footer links. Changes are live within a minute.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <NavigationManager items={items} />
      )}
    </div>
  );
}
