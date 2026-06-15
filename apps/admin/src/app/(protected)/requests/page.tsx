import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListOfficeRequests, type OfficeRequest } from '@/lib/api';
import RequestsQueue from '@/components/RequestsQueue';

export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let rows: OfficeRequest[] = [];
  let error = '';
  try {
    rows = await apiListOfficeRequests(session.accessToken);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load requests';
  }

  const open = rows.filter((r) => !['APPROVED', 'REJECTED', 'CLOSED'].includes(r.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Agent Requests</h1>
        <p className="admin-page-sub">
          Risk assessments, location due diligence, checklists and photo submissions from agents in your region.
          {open > 0 ? ` ${open} open.` : ' All caught up.'}
        </p>
      </div>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <RequestsQueue rows={rows} />
      )}
    </div>
  );
}
