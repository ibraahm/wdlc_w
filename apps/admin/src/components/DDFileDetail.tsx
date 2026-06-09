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

// Codes that have no expiry date per the checklist
const NO_EXPIRY = new Set(['r0', 'r3', 'r11']);

const STAGES = [
  'APPLICATION', 'UNDER_REVIEW', 'DD_IN_PROGRESS', 'ACTIVE',
  'SUSPENDED', 'TERMINATED', 'REJECTED',
];
const STAGE_LABELS: Record<string, string> = {
  APPLICATION: 'Application',
  UNDER_REVIEW: 'Under Review',
  DD_IN_PROGRESS: 'DD In Progress',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  TERMINATED: 'Terminated',
  REJECTED: 'Rejected',
};
const STAGE_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
  TERMINATED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-100 text-red-700',
  APPLICATION: 'bg-blue-50 text-blue-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  DD_IN_PROGRESS: 'bg-purple-100 text-purple-800',
};
const RISK_COLOR: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-700',
};
const STATUS_COLOR: Record<string, string> = {
  OK: 'bg-green-100 text-green-700',
  EXPIRING: 'bg-yellow-100 text-yellow-700',
  EXPIRED: 'bg-red-100 text-red-700',
  MISSING: 'bg-gray-100 text-gray-500',
  NA: 'bg-gray-50 text-gray-400',
};

const SECTIONS: { key: DDDocument['section']; title: string; icon: string }[] = [
  { key: 'DOCUMENTATION', title: 'Documentation', icon: '📄' },
  { key: 'COMPLIANCE', title: 'Compliance', icon: '🛡️' },
  { key: 'ONGOING', title: 'Ongoing Due Diligence', icon: '🔄' },
];

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

  const docs = f.documents ?? [];
  const totalOk = docs.filter((d) => d.status === 'OK').length;
  const totalMissing = docs.filter((d) => d.status === 'MISSING').length;
  const totalExpired = docs.filter((d) => d.status === 'EXPIRED' || d.status === 'EXPIRING').length;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/agent-dd" className="text-sm text-gray-400 hover:text-gray-600">← DD Files</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{f.agentName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {f.entityType === 'BUSINESS' ? 'Business' : 'Individual'}
            {f.states ? ` · ${f.states}` : ''}
            {f.regionalOffice ? ` · ${f.regionalOffice}` : ''}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STAGE_COLOR[f.stage] ?? 'bg-gray-100 text-gray-600'}`}>
            {STAGE_LABELS[f.stage] ?? f.stage}
          </span>
          {f.riskRating && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${RISK_COLOR[f.riskRating]}`}>
              {f.riskRating} Risk
            </span>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</p>}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-600">{totalOk}</p>
          <p className="text-xs text-gray-500 mt-0.5">Complete</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
          <p className={`text-2xl font-bold ${totalMissing > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{totalMissing}</p>
          <p className="text-xs text-gray-500 mt-0.5">Missing</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
          <p className={`text-2xl font-bold ${totalExpired > 0 ? 'text-red-600' : 'text-gray-300'}`}>{totalExpired}</p>
          <p className="text-xs text-gray-500 mt-0.5">Expired / Expiring</p>
        </div>
      </div>

      {/* Controls row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Stage</p>
          <select
            defaultValue={f.stage}
            disabled={isPending}
            onChange={(e) => run(() => setDDStageAction(f.id, e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          {f.onboardedAt && (
            <p className="text-xs text-gray-400 mt-1.5">
              Onboarded {new Date(f.onboardedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Risk Rating</p>
          <select
            defaultValue={f.riskRating ?? ''}
            disabled={isPending}
            onChange={(e) => e.target.value && run(() => setDDRiskAction(f.id, e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Select…</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Periodic Review</p>
          <input
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="Reviewed by"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={nextReview}
            onChange={(e) => setNextReview(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            disabled={isPending || !reviewer.trim()}
            onClick={() => run(() => recordDDReviewAction(f.id, reviewer.trim(), nextReview || undefined))}
            className="w-full rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            Record Review
          </button>
          {f.lastReviewedAt && (
            <p className="text-xs text-gray-400 mt-1.5">
              Last: {new Date(f.lastReviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {f.reviewedBy ? ` · ${f.reviewedBy}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Document sections */}
      {SECTIONS.map((section) => {
        const sectionDocs = docs.filter((d) => d.section === section.key);
        if (sectionDocs.length === 0) return null;
        return (
          <div key={section.key}>
            <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <span>{section.icon}</span> {section.title}
            </h2>
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
              {sectionDocs.map((d) => (
                <DocRow key={d.code} fileId={f.id} doc={d} disabled={isPending} onChange={run} />
              ))}
            </div>
          </div>
        );
      })}
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
  const hasExpiry = !NO_EXPIRY.has(doc.code);
  const [notes, setNotes] = useState(doc.notes ?? '');
  const [dropbox, setDropbox] = useState(doc.dropboxUrl ?? '');
  const [open, setOpen] = useState(false);

  return (
    <div className={na ? 'opacity-40' : ''}>
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          checked={doc.present}
          disabled={disabled || na}
          onChange={(e) => onChange(() => updateDDDocumentAction(fileId, doc.code, { present: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer shrink-0"
        />
        <span className={`flex-1 text-sm ${doc.present ? 'text-gray-900' : 'text-gray-500'}`}>
          {doc.label}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {hasExpiry && (
            <input
              type="date"
              defaultValue={doc.expiry?.slice(0, 10) ?? ''}
              disabled={disabled || na}
              onChange={(e) => onChange(() => updateDDDocumentAction(fileId, doc.code, { expiry: e.target.value || null }))}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 w-32"
              title="Expiry date"
            />
          )}

          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLOR[doc.status]}`}>
            {doc.status}
          </span>

          <button
            onClick={() => setOpen((o) => !o)}
            className="text-gray-300 hover:text-gray-600 text-sm px-1 leading-none"
            title="Notes / Dropbox link"
          >
            {open ? '▲' : '⋯'}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-3 pt-1 flex gap-3 bg-gray-50 border-t border-gray-100">
          <input
            value={dropbox}
            placeholder="Dropbox URL"
            disabled={disabled || na}
            onChange={(e) => setDropbox(e.target.value)}
            onBlur={() => dropbox !== (doc.dropboxUrl ?? '') && onChange(() => updateDDDocumentAction(fileId, doc.code, { dropboxUrl: dropbox || null }))}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            value={notes}
            placeholder="Notes"
            disabled={disabled || na}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (doc.notes ?? '') && onChange(() => updateDDDocumentAction(fileId, doc.code, { notes }))}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      )}
    </div>
  );
}
