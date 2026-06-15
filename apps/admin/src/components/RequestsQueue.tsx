'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { OfficeRequest } from '@/lib/api';
import { loadOfficeRequestAction, updateOfficeRequestAction, officeRequestMessageAction } from '@/lib/actions';

const STATUSES = ['OPEN', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'CLOSED'] as const;
const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700', IN_REVIEW: 'bg-blue-100 text-blue-700', NEEDS_INFO: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700', CLOSED: 'bg-gray-200 text-gray-600',
};
const TYPE_LABEL: Record<string, string> = {
  RISK_ASSESSMENT: 'Risk assessment', LOCATION_DD: 'Location DD', CHECKLIST: 'Checklist', PHOTOS: 'Photos', OTHER: 'Other',
};
function when(s: string) { return new Date(s).toLocaleString(); }

export default function RequestsQueue({ rows }: { rows: OfficeRequest[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null);
  const [detail, setDetail] = useState<OfficeRequest | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const filtered = useMemo(() => (filter === 'ALL' ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length };
    for (const s of STATUSES) c[s] = rows.filter((r) => r.status === s).length;
    return c;
  }, [rows]);

  function open(id: string) {
    setSelectedId(id); setDetail(null); setError('');
    start(async () => {
      const res = await loadOfficeRequestAction(id);
      if (res.request) setDetail(res.request); else setError(res.error ?? 'Load failed');
    });
  }
  function setStatus(status: string) {
    if (!detail) return;
    start(async () => {
      const res = await updateOfficeRequestAction(detail.id, { status });
      if (res.ok) { open(detail.id); router.refresh(); } else setError(res.error ?? 'Update failed');
    });
  }
  function send() {
    if (!detail || !body.trim()) return;
    start(async () => {
      const res = await officeRequestMessageAction(detail.id, body);
      if (res.ok) { setBody(''); open(detail.id); } else setError(res.error ?? 'Send failed');
    });
  }

  // Load the first request on mount.
  useEffect(() => {
    if (selectedId) open(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {(['ALL', ...STATUSES] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${filter === f ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'ALL' ? 'All' : f.replace('_', ' ')} ({counts[f] ?? 0})
            </button>
          ))}
        </div>
        <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
          {filtered.length === 0 && <p className="text-sm text-gray-400 italic px-1">Nothing here.</p>}
          {filtered.map((r) => (
            <button key={r.id} onClick={() => open(r.id)}
              className={`w-full rounded-lg border p-3 text-left transition ${r.id === selectedId ? 'border-navy bg-navy/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-gray-900">{r.subject}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[r.status]}`}>{r.status.replace('_', ' ')}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {TYPE_LABEL[r.type] ?? r.type}{r.agent ? ` · ${r.agent.firstName} ${r.agent.lastName}` : ''}{r.branchCode ? ` · ${r.branchCode}` : ''}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        {!detail ? (
          <p className="text-sm text-gray-400">{pending ? 'Loading…' : 'Select a request.'}</p>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{detail.subject}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {TYPE_LABEL[detail.type] ?? detail.type} · {detail.agent ? `${detail.agent.firstName} ${detail.agent.lastName} (${detail.agent.email})` : 'agent'}
                  {detail.branchCode ? ` · ${detail.branchCode}` : ''} · {when(detail.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {STATUSES.map((st) => (
                  <button key={st} disabled={pending || detail.status === st} onClick={() => setStatus(st)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-100 ${detail.status === st ? STATUS_COLOR[st] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {detail.details && <p className="whitespace-pre-wrap text-sm text-gray-800">{detail.details}</p>}

            {detail.attachments.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Attachments</p>
                <ul className="text-sm space-y-0.5">
                  {detail.attachments.map((a, i) => (
                    <li key={i}><a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{a.name || a.url} ↗</a></li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Conversation</h3>
              {(detail.messages ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 italic">No messages yet.</p>
              ) : (
                <ol className="space-y-2">
                  {(detail.messages ?? []).map((m) => (
                    <li key={m.id} className={`rounded-lg border p-3 text-sm ${m.authorType === 'office' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="text-[11px] text-gray-500">{m.authorType === 'office' ? 'Office' : 'Agent'}{m.authorName ? ` · ${m.authorName}` : ''} · {when(m.createdAt)}</div>
                      <p className="mt-1 whitespace-pre-wrap text-gray-800">{m.body}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply to the agent…" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
              <button onClick={send} disabled={pending || !body.trim()} className="rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy/90 disabled:opacity-50">Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
