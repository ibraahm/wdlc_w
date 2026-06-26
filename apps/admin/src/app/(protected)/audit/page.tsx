import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiGetAuditLog, type AuditLogEntry } from '@/lib/api';
import AuditLogViewer, { type AuditFilters } from '@/components/AuditLogViewer';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const ALLOWED = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR'];

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!ALLOWED.includes(session.user.role)) redirect('/dashboard');

  const filters: AuditFilters = {
    action: searchParams?.action ?? '',
    entity: searchParams?.entity ?? '',
    actorType: searchParams?.actorType ?? '',
    from: searchParams?.from ?? '',
    to: searchParams?.to ?? '',
  };
  const page = Math.max(0, parseInt(searchParams?.page ?? '0', 10) || 0);

  let items: AuditLogEntry[] = [];
  let total = 0;
  let error = '';
  try {
    const res = await apiGetAuditLog(session.accessToken, {
      action: filters.action || undefined,
      entity: filters.entity || undefined,
      actorType: filters.actorType || undefined,
      from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
      to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    });
    items = res.items;
    total = res.total;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load the audit log';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Audit Log</h1>
        <p className="admin-section-subtitle">
          A complete, tamper-evident record of every change across the platform — who did what, when,
          and the before/after. Filter, page, and export for examiners.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <AuditLogViewer items={items} total={total} page={page} pageSize={PAGE_SIZE} filters={filters} />
      )}
    </div>
  );
}
