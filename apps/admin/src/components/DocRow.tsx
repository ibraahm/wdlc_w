'use client';

import { useState } from 'react';
import type { DDDocument } from '@/lib/api';
import { updateDDDocumentAction } from '@/lib/actions';
import { ONBOARDING_SECTIONS, ATTENTION, DATE_MIN, DATE_MAX, DATE_MAX_YEAR } from './dd-checklist';

// Readable status pill (dot + label) and a left-edge accent for fast scanning.
const STATUS_META: Record<string, { label: string; dot: string; pill: string; accent: string }> = {
  OK: { label: 'Complete', dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 border-green-200', accent: 'border-l-green-400' },
  EXPIRING: { label: 'Due soon', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 border-amber-200', accent: 'border-l-amber-400' },
  EXPIRED: { label: 'Overdue', dot: 'bg-red-500', pill: 'bg-red-50 text-red-700 border-red-200', accent: 'border-l-red-500' },
  MISSING: { label: 'Missing', dot: 'bg-gray-300', pill: 'bg-gray-50 text-gray-500 border-gray-200', accent: 'border-l-gray-200' },
  NA: { label: 'N/A', dot: 'bg-gray-200', pill: 'bg-gray-50 text-gray-400 border-gray-200', accent: 'border-l-transparent' },
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = iso.slice(0, 10);
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// Human "in N days" / "N days ago", by UTC calendar date (no off-by-one).
function relativeDate(iso?: string | null): string {
  if (!iso) return '';
  const d = iso.slice(0, 10);
  const target = Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((target - today) / 86_400_000);
  if (days === 0) return 'today';
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
  return `${-days} day${days === -1 ? '' : 's'} ago`;
}

export default function DocRow({
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
  const basis = doc.dateBasis ?? 'EXPIRY';
  const dated = basis !== 'NONE'; // whether a date applies at all
  const isReceived = basis === 'RECEIVED';
  const recheck = doc.recheckMonths ?? undefined; // months, for recurring RECEIVED items
  const onboardingRequired = ONBOARDING_SECTIONS.has(doc.section) && !na;
  const [notes, setNotes] = useState(doc.notes ?? '');
  const [dropbox, setDropbox] = useState(doc.dropboxUrl ?? '');
  const [open, setOpen] = useState(false);
  const [dateVal, setDateVal] = useState(doc.expiry?.slice(0, 10) ?? '');
  const [dateErr, setDateErr] = useState('');

  const dateLabel = isReceived ? 'date received' : 'expiry date';

  // Save the date (received or expiry), blocking non-viable years.
  function commitDate(v: string) {
    setDateVal(v);
    setDateErr('');
    if (!v) {
      onChange(() => updateDDDocumentAction(fileId, doc.code, { expiry: null }));
      return;
    }
    const year = Number(v.slice(0, 4));
    if (!Number.isFinite(year) || year < 2000 || year > DATE_MAX_YEAR) {
      setDateErr(`Year must be between 2000 and ${DATE_MAX_YEAR}`);
      return;
    }
    onChange(() => updateDDDocumentAction(fileId, doc.code, { expiry: v }));
  }

  // One-click "rechecked today": mark present and set the received date to today
  // (the recheck-due date is recomputed server-side from the cadence).
  function recheckedToday() {
    const t = todayISO();
    setDateVal(t);
    setDateErr('');
    onChange(() => updateDDDocumentAction(fileId, doc.code, { present: true, expiry: t }));
  }

  const meta = STATUS_META[doc.status] ?? STATUS_META.MISSING;

  // The line under the date: what's due and when.
  function dueLine() {
    if (dateErr) return <span className="text-[11px] text-red-600">{dateErr}</span>;
    if (!dateVal) {
      return doc.present && !na ? (
        <span className="text-[11px] text-amber-600">Add {dateLabel}</span>
      ) : null;
    }
    if (isReceived) {
      if (recheck && doc.dueDate) {
        return (
          <span className="text-[11px] text-gray-400">
            Recheck due {fmtDate(doc.dueDate)} ({relativeDate(doc.dueDate)})
          </span>
        );
      }
      return <span className="text-[11px] text-gray-400">Received {fmtDate(dateVal)}</span>;
    }
    return <span className="text-[11px] text-gray-400">Expires {relativeDate(dateVal)}</span>;
  }

  return (
    <div className={`border-l-4 ${meta.accent} ${na ? 'opacity-60' : ''} ${ATTENTION.has(doc.status) ? 'bg-amber-50/30' : ''}`}>
      <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={doc.present}
            disabled={disabled || na}
            onChange={(e) => onChange(() => updateDDDocumentAction(fileId, doc.code, { present: e.target.checked }))}
            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-sm font-medium ${doc.present ? 'text-gray-900' : 'text-gray-600'}`}>{doc.label}</p>
              {onboardingRequired && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Activation item</span>
              )}
              {isReceived && recheck && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">recheck every {recheck} mo</span>
              )}
              {!dated && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">No date</span>
              )}
            </div>
            {(doc.notes || doc.dropboxUrl) && !open && (
              <p className="mt-1 truncate text-xs text-gray-400">{doc.notes || doc.dropboxUrl}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {dated && (
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  min={DATE_MIN}
                  max={DATE_MAX}
                  value={dateVal}
                  disabled={disabled || na}
                  onChange={(e) => commitDate(e.target.value)}
                  aria-label={`${doc.label} ${dateLabel}`}
                  className={`rounded-lg border px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 ${dateErr ? 'border-red-300' : 'border-gray-200'}`}
                  title={isReceived ? 'Date received' : 'Expiry date'}
                />
                {isReceived && recheck && !na && (
                  <button
                    type="button"
                    onClick={recheckedToday}
                    disabled={disabled}
                    title={`Mark rechecked today; next recheck due in ${recheck} months`}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Rechecked
                  </button>
                )}
              </div>
              {dueLine()}
            </div>
          )}
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          {doc.dropboxUrl && (
            <a
              href={doc.dropboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              title="Open the evidence document"
            >
              Open ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50"
          >
            {open ? 'Close' : doc.dropboxUrl || doc.notes ? 'Edit' : 'Evidence'}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Dropbox URL</span>
            <input
              value={dropbox}
              placeholder="https://..."
              disabled={disabled || na}
              onChange={(e) => setDropbox(e.target.value)}
              onBlur={() => dropbox !== (doc.dropboxUrl ?? '') && onChange(() => updateDDDocumentAction(fileId, doc.code, { dropboxUrl: dropbox || null }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Notes</span>
            <input
              value={notes}
              placeholder="Evidence notes"
              disabled={disabled || na}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== (doc.notes ?? '') && onChange(() => updateDDDocumentAction(fileId, doc.code, { notes }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
        </div>
      )}
    </div>
  );
}
