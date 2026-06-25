'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { WebsiteForm, WebsiteSubmission } from '@/lib/api';
import {
  setSubmissionStatusAction,
  addSubmissionNoteAction,
  replySubmissionAction,
  archiveSubmissionAction,
  unarchiveSubmissionAction,
  deleteSubmissionAction,
} from '@/lib/actions';

export type Row = { form: WebsiteForm; submission: WebsiteSubmission };

const STATUSES = ['NEW', 'IN_PROGRESS', 'RESPONDED', 'CLOSED'] as const;
const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESPONDED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-200 text-gray-600',
};

// Service-level targets: how long an open case may sit before it's flagged.
const SLA_HOURS: Record<string, number> = { NEW: 24, IN_PROGRESS: 72 };
function slaState(s: WebsiteSubmission): 'ok' | 'soon' | 'breach' {
  const status = s.status || 'NEW';
  const limit = SLA_HOURS[status];
  if (!limit) return 'ok'; // RESPONDED / CLOSED
  const ageH = (Date.now() - new Date(s.createdAt).getTime()) / 3600000;
  if (ageH >= limit) return 'breach';
  if (ageH >= limit * 0.75) return 'soon';
  return 'ok';
}

// Canned reply templates. {name} is replaced with the submitter's first name.
const CANNED: { label: string; subjectSuffix?: string; body: string }[] = [
  {
    label: 'Acknowledge receipt',
    body: 'Hello {name},\n\nThank you for contacting World Direct Link. We have received your message and a member of our team is reviewing it. We will follow up shortly.\n\nKind regards,\nWorld Direct Link',
  },
  {
    label: 'Request more information',
    body: 'Hello {name},\n\nThank you for reaching out. To help us assist you, could you please provide a few more details?\n\n- \n- \n\nOnce we have this, we will continue with your request.\n\nKind regards,\nWorld Direct Link',
  },
  {
    label: 'Resolved / closing',
    body: 'Hello {name},\n\nWe are glad to let you know your request has been resolved. If there is anything else we can help with, simply reply to this email.\n\nKind regards,\nWorld Direct Link',
  },
];

function fmt(v: unknown): string {
  if (Array.isArray(v)) return v.map(fmt).join(', ');
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function titleize(k: string) {
  return k.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (c) => c.toUpperCase());
}
function submitterEmail(d: Record<string, unknown>): string | null {
  const v = d.email ?? d.emailAddress ?? d.Email;
  return typeof v === 'string' && v.includes('@') ? v : null;
}
function submitterFirstName(d: Record<string, unknown>): string {
  const v = fmt(d.firstName ?? d.name ?? d.fullName);
  return v && v !== '-' ? v.split(' ')[0] : 'there';
}
function heading(d: Record<string, unknown>, fallback: string) {
  const name = fmt(d.name ?? d.fullName ?? d.firstName);
  const subj = fmt(d.subject ?? d.reason ?? d.topic);
  return [name !== '-' ? name : null, subj !== '-' ? subj : null].filter(Boolean).join(' - ') || fallback;
}
function when(s: string) { return new Date(s).toLocaleString(); }

const SLA_BADGE = {
  breach: { cls: 'bg-red-100 text-red-700', label: 'SLA breach' },
  soon: { cls: 'bg-amber-100 text-amber-700', label: 'SLA due soon' },
  ok: null,
} as const;

export default function SubmissionsInbox({
  rows,
  archivedRows = [],
  currentUser,
}: {
  rows: Row[];
  archivedRows?: Row[];
  currentUser?: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.submission.id ?? null);

  // Likely duplicates among active rows: same form + same email (or, lacking an
  // email, identical data). The earliest in each group is kept as the original;
  // the rest are flagged so test/double submissions are easy to clear.
  const dupIds = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const d = r.submission.data ?? {};
      const email = submitterEmail(d);
      const key = `${r.form.id}|${email ? email.toLowerCase() : JSON.stringify(d)}`;
      const g = groups.get(key);
      if (g) g.push(r); else groups.set(key, [r]);
    }
    const ids = new Set<string>();
    Array.from(groups.values()).forEach((g) => {
      if (g.length < 2) return;
      const sorted = [...g].sort((a, b) => new Date(a.submission.createdAt).getTime() - new Date(b.submission.createdAt).getTime());
      sorted.slice(1).forEach((r) => ids.add(r.submission.id));
    });
    return ids;
  }, [rows]);

  const filtered = useMemo(() => {
    let list: Row[];
    if (filter === 'ARCHIVED') list = archivedRows;
    else if (filter === 'DUP') list = rows.filter((r) => dupIds.has(r.submission.id));
    else if (filter === 'ALL') list = rows;
    else if (filter === 'SLA') list = rows.filter((r) => slaState(r.submission) === 'breach');
    else list = rows.filter((r) => (r.submission.status || 'NEW') === filter);
    // Surface SLA breaches first, then newest.
    return [...list].sort((a, b) => {
      const sa = slaState(a.submission) === 'breach' ? 0 : 1;
      const sb = slaState(b.submission) === 'breach' ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return new Date(b.submission.createdAt).getTime() - new Date(a.submission.createdAt).getTime();
    });
  }, [rows, archivedRows, dupIds, filter]);

  const allRows = useMemo(() => [...rows, ...archivedRows], [rows, archivedRows]);
  const selected = allRows.find((r) => r.submission.id === selectedId) ?? filtered[0] ?? null;
  const selectedArchived = !!selected && !!selected.submission.archivedAt;

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      ALL: rows.length,
      SLA: rows.filter((r) => slaState(r.submission) === 'breach').length,
      DUP: dupIds.size,
      ARCHIVED: archivedRows.length,
    };
    for (const s of STATUSES) c[s] = rows.filter((r) => (r.submission.status || 'NEW') === s).length;
    return c;
  }, [rows, archivedRows, dupIds]);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {(['ALL', 'SLA', ...STATUSES, 'DUP', 'ARCHIVED'] as const).map((f) => {
            const label = f === 'ALL' ? 'All' : f === 'SLA' ? 'SLA breach' : f === 'DUP' ? 'Duplicates' : f === 'ARCHIVED' ? 'Archived' : f.replace('_', ' ');
            const accent = filter === f
              ? 'bg-navy text-white'
              : f === 'SLA' && counts.SLA > 0 ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : f === 'DUP' && counts.DUP > 0 ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
            return (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${accent}`}>
                {label} ({counts[f] ?? 0})
              </button>
            );
          })}
        </div>
        <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
          {filtered.length === 0 && <p className="text-sm text-gray-400 italic px-1">Nothing here.</p>}
          {filtered.map(({ form, submission }) => {
            const d = submission.data ?? {};
            const active = submission.id === selected?.submission.id;
            const sla = SLA_BADGE[slaState(submission)];
            return (
              <button
                key={submission.id}
                onClick={() => setSelectedId(submission.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${active ? 'border-navy bg-navy/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900">{heading(d, form.name)}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[submission.status] ?? STATUS_COLOR.NEW}`}>
                    {(submission.status || 'NEW').replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-500">{form.name} · {when(submission.createdAt)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {sla && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${sla.cls}`}>{sla.label}</span>}
                  {dupIds.has(submission.id) && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Duplicate</span>}
                  {submission.archivedAt && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">Archived</span>}
                  {submission.assignee && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">@{submission.assignee}</span>}
                  {submission.messages && submission.messages.length > 0 && (
                    <span className="text-[11px] text-gray-400">{submission.messages.length} msg</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? <Detail key={selected.submission.id} row={selected} archived={selectedArchived} currentUser={currentUser} onChange={() => { setSelectedId(null); router.refresh(); }} /> : (
        <p className="text-sm text-gray-400">Select a submission.</p>
      )}
    </div>
  );
}

function Detail({ row, archived, currentUser, onChange }: { row: Row; archived: boolean; currentUser?: string; onChange: () => void }) {
  const { form, submission } = row;
  const data = submission.data ?? {};
  const email = submitterEmail(data);
  const firstName = submitterFirstName(data);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'reply' | 'note'>('reply');
  const [subject, setSubject] = useState(`Re: ${form.name} - World Direct Link`);
  const [replyBody, setReplyBody] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [assignee, setAssignee] = useState(submission.assignee ?? '');
  const sla = SLA_BADGE[slaState(submission)];

  function setStatus(status: string) {
    setError('');
    start(async () => {
      const res = await setSubmissionStatusAction(submission.id, status, submission.assignee ?? undefined);
      if (res.ok) onChange(); else setError(res.error ?? 'Failed');
    });
  }
  function saveAssignee(name: string) {
    setError('');
    start(async () => {
      const res = await setSubmissionStatusAction(submission.id, submission.status || 'NEW', name);
      if (res.ok) onChange(); else setError(res.error ?? 'Failed');
    });
  }
  function sendReply() {
    setError('');
    start(async () => {
      const res = await replySubmissionAction(submission.id, subject, replyBody);
      if (res.ok) { setReplyBody(''); onChange(); } else setError(res.error ?? 'Reply failed');
    });
  }
  function addNote() {
    setError('');
    start(async () => {
      const res = await addSubmissionNoteAction(submission.id, noteBody);
      if (res.ok) { setNoteBody(''); onChange(); } else setError(res.error ?? 'Failed');
    });
  }
  function applyCanned(idx: number) {
    if (idx < 0) return;
    setReplyBody(CANNED[idx].body.replace(/\{name\}/g, firstName));
  }
  function archive() {
    if (!confirm('Archive this submission? It moves to the Archived view but is kept on record.')) return;
    setError('');
    start(async () => { const res = await archiveSubmissionAction(submission.id); if (res.ok) onChange(); else setError(res.error ?? 'Archive failed'); });
  }
  function restore() {
    setError('');
    start(async () => { const res = await unarchiveSubmissionAction(submission.id); if (res.ok) onChange(); else setError(res.error ?? 'Restore failed'); });
  }
  function remove() {
    if (!confirm('Permanently delete this submission and its case history? This cannot be undone.')) return;
    setError('');
    start(async () => { const res = await deleteSubmissionAction(submission.id); if (res.ok) onChange(); else setError(res.error ?? 'Delete failed'); });
  }

  const messages = submission.messages ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">{heading(data, form.name)}</h2>
            {sla && <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${sla.cls}`}>{sla.label}</span>}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {form.name} · {when(submission.createdAt)}{email ? ` · ${email}` : ' · no email on file'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((st) => (
            <button
              key={st}
              disabled={pending || submission.status === st}
              onClick={() => setStatus(st)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-100 ${submission.status === st ? STATUS_COLOR[st] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Archive / delete actions */}
      <div className="flex flex-wrap items-center gap-2">
        {archived ? (
          <button onClick={restore} disabled={pending} className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy/90 disabled:opacity-50">
            Restore
          </button>
        ) : (
          <button onClick={archive} disabled={pending} className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">
            Archive
          </button>
        )}
        <button onClick={remove} disabled={pending} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
          Delete permanently
        </button>
        {archived && <span className="text-[11px] text-gray-400">This submission is archived.</span>}
      </div>

      {/* Assignment */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Assigned to</span>
        <input
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          onBlur={() => { if (assignee !== (submission.assignee ?? '')) saveAssignee(assignee.trim()); }}
          placeholder="Unassigned"
          className="min-w-[160px] flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm"
        />
        {currentUser && submission.assignee !== currentUser && (
          <button onClick={() => { setAssignee(currentUser); saveAssignee(currentUser); }} disabled={pending}
            className="rounded bg-navy px-2.5 py-1 text-xs font-semibold text-white hover:bg-navy/90 disabled:opacity-50">
            Assign to me
          </button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(data).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{titleize(k)}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">{fmt(v)}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Case history</h3>
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No replies or notes yet.</p>
        ) : (
          <ol className="space-y-2">
            {messages.map((m) => (
              <li key={m.id} className={`rounded-lg border p-3 text-sm ${m.kind === 'REPLY' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span className="font-semibold">
                    {m.kind === 'REPLY' ? `Email reply${m.toEmail ? ` → ${m.toEmail}` : ''}` : 'Internal note'}
                    {m.authorName ? ` · ${m.authorName}` : ''}
                  </span>
                  <span>{when(m.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-gray-800">{m.body}</p>
                {m.emailError && <p className="mt-1 text-xs text-red-600">⚠ Email failed: {m.emailError}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 p-3">
        <div className="mb-3 flex gap-2">
          <button onClick={() => setTab('reply')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'reply' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}>Email reply</button>
          <button onClick={() => setTab('note')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'note' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}>Internal note</button>
        </div>
        {tab === 'reply' ? (
          <div className="space-y-2">
            {!email && <p className="text-xs text-amber-700">No email address on this submission - you can&apos;t send a reply (use an internal note).</p>}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-gray-500">Canned reply:</label>
              <select
                onChange={(e) => { applyCanned(Number(e.target.value)); e.target.selectedIndex = 0; }}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                defaultValue=""
              >
                <option value="" disabled>Insert a template…</option>
                {CANNED.map((c, i) => <option key={c.label} value={i}>{c.label}</option>)}
              </select>
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={6} placeholder={`Write your reply to ${email ?? 'the submitter'}…`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button onClick={sendReply} disabled={pending || !email || !replyBody.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {pending ? 'Sending…' : 'Send email reply'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={3} placeholder="Internal note (not emailed)…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button onClick={addNote} disabled={pending || !noteBody.trim()}
              className="rounded-lg bg-gray-700 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
              {pending ? 'Saving…' : 'Add note'}
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
