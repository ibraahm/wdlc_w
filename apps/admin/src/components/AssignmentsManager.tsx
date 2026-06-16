'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAssignmentAction, updateAssignmentAction } from '@/lib/actions';
import type { TrainingAssignment } from '@/lib/api';

const REASONS = [
  { value: 'NEW_HIRE', label: 'New hire' },
  { value: 'ANNUAL', label: 'Annual refresher' },
  { value: 'HAZARD', label: 'Safety / hazard exposure' },
  { value: 'ROLE', label: 'Role / position' },
  { value: 'REMEDIATION', label: 'Incident remediation' },
  { value: 'OTHER', label: 'Other' },
];
const REASON_LABEL: Record<string, string> = Object.fromEntries(REASONS.map((r) => [r.value, r.label]));

type CourseOpt = { id: string; title: string };
type AgentOpt = { id: string; name: string; email: string; branchCode: string | null };

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export default function AssignmentsManager({
  initialAssignments,
  courses,
  agents,
}: {
  initialAssignments: TrainingAssignment[];
  courses: CourseOpt[];
  agents: AgentOpt[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [courseId, setCourseId] = useState('');
  const [target, setTarget] = useState<'agent' | 'branch'>('agent');
  const [agentId, setAgentId] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [reason, setReason] = useState('NEW_HIRE');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!courseId) { setError('Choose a course.'); return; }
    if (target === 'agent' && !agentId) { setError('Choose an agent.'); return; }
    if (target === 'branch' && !branchCode.trim()) { setError('Enter a branch code.'); return; }
    startTransition(async () => {
      const res = await createAssignmentAction({
        courseId,
        agentId: target === 'agent' ? agentId : undefined,
        branchCode: target === 'branch' ? branchCode.trim().toUpperCase() : undefined,
        reason,
        note: note.trim() || undefined,
        dueAt: dueAt || null,
      });
      if (res.ok) {
        setCourseId(''); setAgentId(''); setBranchCode(''); setReason('NEW_HIRE'); setDueAt(''); setNote('');
        router.refresh();
      } else setError(res.error ?? 'Assign failed');
    });
  }

  function toggleActive(a: TrainingAssignment) {
    startTransition(async () => {
      const res = await updateAssignmentAction(a.id, { active: !a.active });
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Update failed');
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="bg-gray-100 border border-gray-200 rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">New assignment</h2>
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
            <label className={labelCls}>Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Assign to</label>
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
            <label className={labelCls}>Due date (optional)</label>
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={inputCls} placeholder="e.g. Required after the Q2 policy update" />
        </div>
        <button type="submit" disabled={isPending} className="rounded-md bg-gray-900 text-white text-sm px-4 py-2 disabled:opacity-50">
          {isPending ? 'Saving…' : 'Create assignment'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="p-3 font-medium">Course</th>
              <th className="p-3 font-medium">Target</th>
              <th className="p-3 font-medium">Reason</th>
              <th className="p-3 font-medium">Due</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {initialAssignments.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-gray-500">No assignments yet.</td></tr>
            )}
            {initialAssignments.map((a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="p-3 text-gray-800">{a.courseTitle}</td>
                <td className="p-3 text-gray-600">{a.agentName ? `${a.agentName}` : a.branchCode ? `Branch ${a.branchCode}` : '—'}</td>
                <td className="p-3 text-gray-600">{REASON_LABEL[a.reason] ?? a.reason}</td>
                <td className="p-3 text-gray-600">{fmtDate(a.dueAt)}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => toggleActive(a)} disabled={isPending} className="text-xs text-gray-600 hover:text-gray-900 underline disabled:opacity-50">
                    {a.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
