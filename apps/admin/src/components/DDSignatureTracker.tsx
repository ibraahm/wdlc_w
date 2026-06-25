'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DDSignatureDoc } from '@/lib/api';
import { addDDSignatureAction, updateDDSignatureAction, deleteDDSignatureAction } from '@/lib/actions';

const STATUS_META: Record<DDSignatureDoc['status'], { label: string; cls: string }> = {
  PENDING: { label: 'Not sent', cls: 'bg-gray-100 text-gray-600' },
  SENT: { label: 'Sent', cls: 'bg-blue-100 text-blue-700' },
  SIGNED: { label: 'Signed', cls: 'bg-green-100 text-green-700' },
  DECLINED: { label: 'Declined', cls: 'bg-red-100 text-red-700' },
};
const STATUSES: DDSignatureDoc['status'][] = ['PENDING', 'SENT', 'SIGNED', 'DECLINED'];
const PRESETS = ['Authorized Agent Agreement', 'Agent Application'];

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
}

export default function DDSignatureTracker({
  fileId,
  signatures,
  canEdit,
}: {
  fileId: string;
  signatures: DDSignatureDoc[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [method, setMethod] = useState('');

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError('');
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? 'Action failed');
      else { after?.(); router.refresh(); }
    });
  }

  function add() {
    if (!label.trim()) { setError('Enter a document name.'); return; }
    run(() => addDDSignatureAction(fileId, { label: label.trim(), method: method.trim() || undefined }), () => { setLabel(''); setMethod(''); });
  }

  const signedCount = signatures.filter((s) => s.status === 'SIGNED').length;

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Document signatures</h2>
          <p className="text-xs text-gray-400">
            Track which documents were sent and signed (recorded manually). {signatures.length > 0 && `${signedCount}/${signatures.length} signed.`}
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {signatures.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-gray-400">No documents tracked yet.</p>
        )}
        {signatures.map((s) => {
          const meta = STATUS_META[s.status] ?? STATUS_META.PENDING;
          return (
            <div key={s.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[1.4fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                  {s.method && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">{s.method}</span>}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  {fmt(s.sentAt) ? `Sent ${fmt(s.sentAt)}` : 'Not sent'}
                  {fmt(s.signedAt) ? ` · Signed ${fmt(s.signedAt)}` : ''}
                </p>
                {canEdit ? (
                  <input
                    defaultValue={s.notes ?? ''}
                    placeholder="Notes (optional)"
                    onBlur={(e) => { if (e.target.value !== (s.notes ?? '')) run(() => updateDDSignatureAction(fileId, s.id, { notes: e.target.value || null })); }}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                ) : (
                  s.notes && <p className="mt-1 text-xs text-gray-500">{s.notes}</p>
                )}
              </div>

              {canEdit && (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <select
                    value={s.status}
                    disabled={isPending}
                    onChange={(e) => run(() => updateDDSignatureAction(fileId, s.id, { status: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {STATUSES.map((st) => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Remove "${s.label}" from tracking?`)) run(() => deleteDDSignatureAction(fileId, s.id)); }}
                    disabled={isPending}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Document name (e.g. Authorized Agent Agreement)"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="Method (e.g. DocuSign, Email)"
              className="w-44 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="button"
              onClick={add}
              disabled={isPending}
              className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="self-center text-[11px] text-gray-400">Quick add:</span>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => run(() => addDDSignatureAction(fileId, { label: p }))}
                disabled={isPending}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-white disabled:opacity-50"
              >
                + {p}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}
