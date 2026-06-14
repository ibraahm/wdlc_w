'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { WebsiteForm, WebsiteSubmission } from '@/lib/api';
import { setSubmissionStatusAction, addSubmissionNoteAction, replySubmissionAction } from '@/lib/actions';

export type Row = { form: WebsiteForm; submission: WebsiteSubmission };

const STATUSES = ['NEW', 'IN_PROGRESS', 'RESPONDED', 'CLOSED'] as const;
const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESPONDED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-200 text-gray-600',
};

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
function heading(d: Record<string, unknown>, fallback: string) {
  const name = fmt(d.name ?? d.fullName ?? d.firstName);
  const subj = fmt(d.subject ?? d.reason ?? d.topic);
  return [name !== '-' ? name : null, subj !== '-' ? subj : null].filter(Boolean).join(' - ') || fallback;
}
function when(s: string) { return new Date(s).toLocaleString(); }

export default function SubmissionsInbox({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.submission.id ?? null);

  const filtered = useMemo(
    () => (filter === 'ALL' ? rows : rows.filter((r) => (r.submission.status || 'NEW') === filter)),
    [rows, filter],
  );
  const selected = rows.find((r) => r.submission.id === selectedId) ?? filtered[0] ?? null;

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length };
    for (const s of STATUSES) c[s] = rows.filter((r) => (r.submission.status || 'NEW') === s).length;
    return c;
  }, [rows]);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      {/* List */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {(['ALL', ...STATUSES] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${filter === f ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f === 'ALL' ? 'All' : f.replace('_', ' ')} ({counts[f] ?? 0})
            </button>
          ))}
        </div>
        <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
          {filtered.length === 0 && <p className="text-sm text-gray-400 italic px-1">Nothing here.</p>}
          {filtered.map(({ form, submission }) => {
            const d = submission.data ?? {};
            const active = submission.id === selected?.submission.id;
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
                {submission.messages && submission.messages.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-gray-400">{submission.messages.length} message(s)</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      {selected ? <Detail key={selected.submission.id} row={selected} onChange={() => router.refresh()} /> : (
        <p className="text-sm text-gray-400">Select a submission.</p>
      )}
    </div>
  );
}

function Detail({ row, onChange }: { row: Row; onChange: () => void }) {
  const { form, submission } = row;
  const data = submission.data ?? {};
  const email = submitterEmail(data);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'reply' | 'note'>('reply');
  const [subject, setSubject] = useState(`Re: ${form.name} - World Direct Link`);
  const [replyBody, setReplyBody] = useState('');
  const [noteBody, setNoteBody] = useState('');

  function setStatus(status: string) {
    setError('');
    start(async () => {
      const res = await setSubmissionStatusAction(submission.id, status);
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

  const messages = submission.messages ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{heading(data, form.name)}</h2>
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

      {/* Submitted fields */}
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(data).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{titleize(k)}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">{fmt(v)}</p>
          </div>
        ))}
      </div>

      {/* Thread */}
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

      {/* Compose */}
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="mb-3 flex gap-2">
          <button onClick={() => setTab('reply')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'reply' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}>Email reply</button>
          <button onClick={() => setTab('note')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'note' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}>Internal note</button>
        </div>
        {tab === 'reply' ? (
          <div className="space-y-2">
            {!email && <p className="text-xs text-amber-700">No email address on this submission - you can&apos;t send a reply (use an internal note).</p>}
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={4} placeholder={`Write your reply to ${email ?? 'the submitter'}…`}
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
