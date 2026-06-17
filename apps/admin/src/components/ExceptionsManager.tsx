'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createExceptionAction, decideExceptionAction } from '@/lib/actions';
import type { TrainingException } from '@/lib/api';

const TYPES = [
  { value: 'WAIVER', label: 'Waiver (excuse entirely)' },
  { value: 'EXTENSION', label: 'Extension (move deadline)' },
  { value: 'EQUIVALENCY', label: 'Equivalency (credit prior training)' },
];

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

function statusBadge(s: string, expired: boolean) {
  if (s === 'APPROVED' && expired) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Expired</span>;
  const map: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700',
    APPROVED: 'bg-green-50 text-green-700',
    REJECTED: 'bg-red-50 text-red-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>{s.charAt(0) + s.slice(1).toLowerCase()}</span>;
}

export default function ExceptionsManager({
  initialExceptions,
  courses,
  agents,
  canDecide,
  canRequest = true,
}: {
  initialExceptions: TrainingException[];
  courses: { id: string; title: string }[];
  agents: { id: string; name: string; email: string }[];
  canDecide: boolean;
  canRequest?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [courseId, setCourseId] = useState('');
  const [target, setTarget] = useState<'agent' | 'branch'>('agent');
  const [agentId, setAgentId] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [type, setType] = useState('WAIVER');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!courseId) { setError('Choose a course.'); return; }
    if (target === 'agent' && !agentId) { setError('Choose an agent.'); return; }
    if (target === 'branch' && !branchCode.trim()) { setError('Enter a branch code.'); return; }
    if (!reason.trim()) { setError('A reason is required.'); return; }
    if (type === 'EXTENSION' && !expiresAt) { setError('An extension needs a new deadline.'); return; }
    startTransition(async () => {
      const res = await createExceptionAction({
        courseId,
        agentId: target === 'agent' ? agentId : undefined,
        branchCode: target === 'branch' ? branchCode.trim().toUpperCase() : undefined,
        type,
        reason: reason.trim(),
        expiresAt: expiresAt || null,
      });
      if (res.ok) {
        setCourseId(''); setAgentId(''); setBranchCode(''); setType('WAIVER'); setReason(''); setExpiresAt('');
        router.refresh();
      } else setError(res.error ?? 'Request failed');
    });
  }

  function decide(id: string, status: 'APPROVED' | 'REJECTED') {
    startTransition(async () => {
      const res = await decideExceptionAction(id, status);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Decision failed');
    });
  }

  return (
    <div className="space-y-6">
      {canRequest && (
      <form onSubmit={submit} className="bg-gray-100 border border-gray-200 rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">Request an exception</h2>
        {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
              <option value="">Select a course…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>For</label>
            <div className="flex gap-2">
              <select value={target} onChange={(e) => setTarget(e.target.value as 'agent' | 'branch')} className={inputCls} style={{ maxWidth: '110px' }}>
                <option value="agent">Agent</option>
                <option value="branch">Branch</option>
              </select>
              {target === 'agent' ? (
                <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={inputCls}>
                  <option value="">Select an agent…</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
                </select>
              ) : (
                <input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="Branch code" className={inputCls} />
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>{type === 'EXTENSION' ? 'New deadline' : 'Expires (optional)'}</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className={inputCls} placeholder="e.g. Completed equivalent state-certified course on file" />
        </div>
        <button type="submit" disabled={isPending} className="rounded-md bg-gray-900 text-white text-sm px-4 py-2 disabled:opacity-50">
          {isPending ? 'Saving…' : 'Submit request'}
        </button>
      </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="p-3 font-medium">Course</th>
              <th className="p-3 font-medium">For</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Reason</th>
              <th className="p-3 font-medium">Expires</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {initialExceptions.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-gray-500">No exceptions yet.</td></tr>
            )}
            {initialExceptions.map((x) => (
              <tr key={x.id} className="border-b border-gray-50 align-top">
                <td className="p-3 text-gray-800">{x.courseTitle}</td>
                <td className="p-3 text-gray-600">{x.agentName ?? (x.branchCode ? `Branch ${x.branchCode}` : '—')}</td>
                <td className="p-3 text-gray-600">{x.type.charAt(0) + x.type.slice(1).toLowerCase()}</td>
                <td className="p-3 text-gray-500 max-w-xs">{x.reason}</td>
                <td className="p-3 text-gray-600">{fmtDate(x.expiresAt)}</td>
                <td className="p-3">{statusBadge(x.status, x.expired)}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  {canDecide && x.status === 'PENDING' ? (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => decide(x.id, 'APPROVED')} disabled={isPending} className="text-xs text-green-700 hover:underline disabled:opacity-50">Approve</button>
                      <button onClick={() => decide(x.id, 'REJECTED')} disabled={isPending} className="text-xs text-red-700 hover:underline disabled:opacity-50">Reject</button>
                    </div>
                  ) : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
