'use client';

import { Fragment, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AuditLogEntry } from '@/lib/api';
import { exportAuditCsvAction } from '@/lib/actions';

export type AuditFilters = { action: string; entity: string; actorType: string; from: string; to: string };

const ENTITIES = ['', 'AgentApplication', 'AgentDDFile', 'AgentDocument', 'DDSignatureDoc', 'FormSubmission', 'Course', 'SiteSetting', 'AdminUser', 'AgentUser'];

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function actorOf(e: AuditLogEntry) {
  if (e.admin?.email) return e.admin.email;
  if (e.agent) return `${e.agent.firstName} ${e.agent.lastName}`.trim() || e.agent.email;
  return 'system';
}

export default function AuditLogViewer({
  items,
  total,
  page,
  pageSize,
  filters,
}: {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  filters: AuditFilters;
}) {
  const router = useRouter();
  const [f, setF] = useState<AuditFilters>(filters);
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, startExport] = useTransition();
  const [error, setError] = useState('');

  function go(params: Partial<AuditFilters & { page: number }>) {
    const merged = { ...f, page: 0, ...params };
    const qs = new URLSearchParams();
    (['action', 'entity', 'actorType', 'from', 'to'] as const).forEach((k) => {
      const v = merged[k];
      if (v) qs.set(k, v);
    });
    if (merged.page) qs.set('page', String(merged.page));
    router.push(`/audit${qs.size ? `?${qs}` : ''}`);
  }

  function exportCsv() {
    setError('');
    startExport(async () => {
      const res = await exportAuditCsvAction(f);
      if (!res.ok || !res.csv) { setError(res.error ?? 'Export failed'); return; }
      const blob = new Blob([res.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const hasActive = !!(f.action || f.entity || f.actorType || f.from || f.to);
  const inputCls = 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && go({})} placeholder="Action contains…" className={inputCls} />
          <select value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })} className={inputCls}>
            {ENTITIES.map((en) => <option key={en} value={en}>{en || 'All entities'}</option>)}
          </select>
          <select value={f.actorType} onChange={(e) => setF({ ...f, actorType: e.target.value })} className={inputCls}>
            <option value="">Any actor</option>
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
          </select>
          <label className="flex items-center gap-1 text-xs text-gray-500">From<input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className={`${inputCls} flex-1`} /></label>
          <label className="flex items-center gap-1 text-xs text-gray-500">To<input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className={`${inputCls} flex-1`} /></label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => go({})} className="rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:opacity-90">Apply filters</button>
          {hasActive && (
            <button onClick={() => { setF({ action: '', entity: '', actorType: '', from: '', to: '' }); router.push('/audit'); }} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Clear</button>
          )}
          <span className="ml-auto text-xs text-gray-500">{total.toLocaleString()} event{total === 1 ? '' : 's'}</span>
          <button onClick={exportCsv} disabled={exporting} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Time</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Actor</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Action</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Entity</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-900"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No audit events match these filters.</td></tr>
            ) : items.map((e) => {
              const open = openId === e.id;
              const hasDetail = e.before != null || e.after != null;
              return (
                <Fragment key={e.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{fmt(e.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-gray-800">{actorOf(e)}</span>
                      {e.actorType && <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">{e.actorType}</span>}
                    </td>
                    <td className="px-4 py-2.5"><code className="text-[12px] text-navy">{e.action}</code></td>
                    <td className="px-4 py-2.5 text-gray-600">{e.entity ?? '—'}{e.entityId ? <span className="text-gray-400"> · {e.entityId.slice(-8)}</span> : ''}</td>
                    <td className="px-4 py-2.5 text-right">
                      {hasDetail && (
                        <button onClick={() => setOpenId(open ? null : e.id)} className="text-xs font-medium text-navy hover:underline">
                          {open ? 'Hide' : 'Details'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {open && hasDetail && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          {e.before != null && (
                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Before</p>
                              <pre className="overflow-x-auto rounded-lg bg-white border border-gray-200 p-2 text-[11px] text-gray-700">{JSON.stringify(e.before, null, 2)}</pre>
                            </div>
                          )}
                          {e.after != null && (
                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">After</p>
                              <pre className="overflow-x-auto rounded-lg bg-white border border-gray-200 p-2 text-[11px] text-gray-700">{JSON.stringify(e.after, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                        {e.ip && <p className="mt-2 text-[11px] text-gray-400">IP {e.ip}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => go({ page: page - 1 })} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">Previous</button>
            <button disabled={to >= total} onClick={() => go({ page: page + 1 })} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
