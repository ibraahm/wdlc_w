import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiListAllSubmissions } from '@/lib/api';
import { EmptyState } from '@/components/ui-admin';
import SubmissionsInbox, { type Row } from '@/components/SubmissionsInbox';

export const dynamic = 'force-dynamic';

export default async function WebsiteSubmissionsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let rows: Row[] = [];
  let archivedRows: Row[] = [];
  let error = '';

  try {
    // Two queries total (active + archived), instead of a per-form fan-out.
    [rows, archivedRows] = await Promise.all([
      apiListAllSubmissions(session.accessToken, false),
      apiListAllSubmissions(session.accessToken, true),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load website submissions';
  }

  const open = rows.filter((r) => !['RESPONDED', 'CLOSED'].includes(r.submission.status || 'NEW')).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Submissions Inbox</h1>
        <p className="admin-section-subtitle">
          Track contact, claim, and support submissions, reply by email, and keep a documented
          case history. {open > 0 ? `${open} open.` : 'All caught up.'}
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : rows.length === 0 && archivedRows.length === 0 ? (
        <EmptyState
          icon="IN"
          title="No submissions yet"
          description="Messages from the public contact, claim, and support forms will appear here."
        />
      ) : (
        <SubmissionsInbox rows={rows} archivedRows={archivedRows} currentUser={session.user.name} />
      )}
    </div>
  );
}
