'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DDFile, DDDocument } from '@/lib/api';
import {
  updateDDDocumentAction,
  setDDStageAction,
  setDDRiskAction,
  recordDDReviewAction,
} from '@/lib/actions';

const STAGES = ['APPLICATION', 'UNDER_REVIEW', 'DD_IN_PROGRESS', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'REJECTED'];
const RISKS = ['LOW', 'MEDIUM', 'HIGH'];
const SECTIONS: { key: DDDocument['section']; title: string }[] = [
  { key: 'DOCUMENTATION', title: '1. Documentation' },
  { key: 'COMPLIANCE', title: '2. Compliance Documentation' },
  { key: 'ONGOING', title: '3. Ongoing Due Diligence' },
];

function statusClasses(s: string): string {
  switch (s) {
    case 'OK': return 'bg-green-100 text-green-800';
    case 'EXPIRING': return 'bg-yellow-100 text-yellow-800';
    case 'EXPIRED': return 'bg-red-100 text-red-800';
    case 'MISSING': return 'bg-gray-200 text-gray-600';
    default: return 'bg-gray-100 text-gray-400';
  }
}

export default function DDFileDetail({ initialFile }: { initialFile: DDFile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const f = initialFile;
  const [reviewer, setReviewer] = useState(f.reviewedBy ?? '');
  const [nextReview, setNextReview] = useState(f.nextReviewDueAt?.slice(0, 10) ?? '');

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError('');
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? 'Update failed');
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/agent-dd" className="text-sm text-gray-500 hover:underline">← Back to DD files</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{f.agentName}</h1>
        <p className="text-sm text-gray-500">
          {f.entityType}{f.states ? ` · ${f.states}` : ''}
          {f.applicationId ? ' · linked to application' : ''}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* File-level controls */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-4">
          <label className="block text-xs text-gray-500 mb-1">Lifecycle stage</label>
          <select
            defaultValue={f.stage}
            disabled={isPending}
            onChange={(e) => run(() => setDDStageAction(f.id, e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          {f.onboardedAt && <p className="text-xs text-gray-400 mt-1">Onboarded {new Date(f.onboardedAt).toLocaleDateString()}</p>}
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <label className="block text-xs text-gray-500 mb-1">Risk rating</label>
          <select
            defaultValue={f.riskRating ?? ''}
            disabled={isPending}
            onChange={(e) => e.target.value && run(() => setDDRiskAction(f.id, e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>Select…</option>
            {RISKS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <label className="block text-xs text-gray-500 mb-1">Periodic review</label>
          <div className="flex gap-2">
            <input
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              placeholder="Reviewed by"
              className="w-1/2 rounded-lg border border-gray-300 px-2 py-2 text-sm"
            />
            <input
              type="date"
              value={nextReview}
              onChange={(e) => setNextReview(e.target.value)}
              className="w-1/2 rounded-lg border border-gray-300 px-2 py-2 text-sm"
            />
          </div>
          <button
            disabled={isPending || !reviewer.trim()}
            onClick={() => run(() => recordDDReviewAction(f.id, reviewer.trim(), nextReview || undefined))}
            className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Record review
          </button>
          {f.lastReviewedAt && <p className="text-xs text-gray-400 mt-1">Last: {new Date(f.lastReviewedAt).toLocaleDateString()} by {f.reviewedBy}</p>}
        </div>
      </div>

      {/* Document register */}
      {SECTIONS.map((section) => (
        <div key={section.key}>
          <h2 className="text-sm font-bold text-gray-700 mb-2">{section.title}</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Document</th>
                  <th className="px-3 py-2">Present</th>
                  <th className="px-3 py-2">Expiry</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Dropbox</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(f.documents ?? []).filter((d) => d.section === section.key).map((d) => (
                  <DocRow key={d.code} fileId={f.id} doc={d} disabled={isPending} onChange={run} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function DocRow({
  fileId,
  doc,
  disabled,
  onChange,
}: {
  fileId: string;
  doc: DDDocument;
  disabled: boolean;
  onChange: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const na = doc.status === 'NA';
  const [notes, setNotes] = useState(doc.notes ?? '');
  const [dropbox, setDropbox] = useState(doc.dropboxUrl ?? '');

  return (
    <tr className={na ? 'opacity-50' : ''}>
      <td className="px-3 py-2 max-w-xs">{doc.label}</td>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={doc.present}
          disabled={disabled || na}
          onChange={(e) => onChange(() => updateDDDocumentAction(fileId, doc.code, { present: e.target.checked }))}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="date"
          defaultValue={doc.expiry?.slice(0, 10) ?? ''}
          disabled={disabled || na}
          onChange={(e) => onChange(() => updateDDDocumentAction(fileId, doc.code, { expiry: e.target.value || null }))}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${statusClasses(doc.status)}`}>{doc.status}</span>
      </td>
      <td className="px-3 py-2">
        <input
          value={dropbox}
          placeholder="Dropbox URL"
          disabled={disabled || na}
          onChange={(e) => setDropbox(e.target.value)}
          onBlur={() => dropbox !== (doc.dropboxUrl ?? '') && onChange(() => updateDDDocumentAction(fileId, doc.code, { dropboxUrl: dropbox }))}
          className="w-40 rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={notes}
          placeholder="Notes"
          disabled={disabled || na}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (doc.notes ?? '') && onChange(() => updateDDDocumentAction(fileId, doc.code, { notes }))}
          className="w-40 rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </td>
    </tr>
  );
}
