'use client';

import { useState, useTransition } from 'react';
import type { Completion, Course, TrainingReport } from '@/lib/api';
import { loadCompletionsAction } from '@/lib/actions';

const inputCls = 'border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function toCsv(rows: Completion[]): string {
  const head = ['Completed', 'Name', 'Email', 'Role', 'Branch', 'State', 'Course', 'Category', 'Score', 'Pass mark', 'Passed', 'Attempt'];
  const lines = rows.map((r) => [
    new Date(r.completedAt).toISOString(),
    `${r.agent.firstName} ${r.agent.lastName}`,
    r.agent.email,
    r.agent.role,
    r.branchCode || r.agent.branchCode || '',
    r.agentState || '',
    r.course.title,
    r.course.category,
    String(r.score),
    String(r.course.passingScore),
    r.passed ? 'YES' : 'NO',
    String(r.attempt),
  ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
  return [head.join(','), ...lines].join('\n');
}

export default function TrainingReports({
  report, courses, initialCompletions,
}: {
  report: TrainingReport; courses: Course[]; initialCompletions: Completion[];
}) {
  const [rows, setRows] = useState<Completion[]>(initialCompletions);
  const [scope, setScope] = useState<'all' | 'state' | 'branch'>('all');
  const [stateVal, setStateVal] = useState('');
  const [branchVal, setBranchVal] = useState('');
  const [courseId, setCourseId] = useState('');
  const [passedOnly, setPassedOnly] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function apply() {
    setError('');
    const filter: { state?: string; branchCode?: string; courseId?: string; passedOnly?: boolean } = {};
    if (scope === 'state' && stateVal.trim()) filter.state = stateVal.trim();
    if (scope === 'branch' && branchVal.trim()) filter.branchCode = branchVal.trim();
    if (courseId) filter.courseId = courseId;
    if (passedOnly) filter.passedOnly = true;
    startTransition(async () => {
      const res = await loadCompletionsAction(filter);
      if (res.rows) setRows(res.rows);
      else setError(res.error ?? 'Load failed');
    });
  }

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-completions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Courses passed per learner</p>
          <div className="mt-2 space-y-1.5">
            {report.courses.length === 0 ? <p className="text-sm text-gray-400">No published courses.</p> :
              report.courses.map((c) => (
                <div key={c.id} className="flex justify-between text-sm">
                  <span className="text-gray-700 truncate pr-2">{c.title}</span>
                  <span className="font-semibold text-gray-900">{c.passedLearners}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completions by state</p>
          <div className="mt-2 space-y-1.5">
            {report.byState.length === 0 ? <p className="text-sm text-gray-400">No data yet.</p> :
              report.byState.map((s) => (
                <div key={s.state} className="flex justify-between text-sm">
                  <span className="text-gray-700">{s.state || '—'}</span>
                  <span className="font-semibold text-gray-900">{s.completions}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completions by branch</p>
          <div className="mt-2 space-y-1.5 max-h-48 overflow-auto">
            {report.byBranch.length === 0 ? <p className="text-sm text-gray-400">No data yet.</p> :
              report.byBranch.map((b) => (
                <div key={b.branchCode} className="flex justify-between text-sm">
                  <span className="text-gray-700 font-mono">{b.branchCode}</span>
                  <span className="font-semibold text-gray-900">{b.completions}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Scope</label>
            <select value={scope} onChange={(e) => setScope(e.target.value as 'all' | 'state' | 'branch')} className={inputCls}>
              <option value="all">All</option>
              <option value="state">By state</option>
              <option value="branch">By agent (branch)</option>
            </select>
          </div>
          {scope === 'state' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State code</label>
              <input value={stateVal} onChange={(e) => setStateVal(e.target.value)} placeholder="GA" className={inputCls} />
            </div>
          )}
          {scope === 'branch' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Branch code</label>
              <input value={branchVal} onChange={(e) => setBranchVal(e.target.value)} placeholder="uswdlc" className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
              <option value="">All courses</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
            <input type="checkbox" checked={passedOnly} onChange={(e) => setPassedOnly(e.target.checked)} />
            Passed only
          </label>
          <button onClick={apply} disabled={isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {isPending ? 'Loading…' : 'Apply'}
          </button>
          <button onClick={exportCsv} disabled={rows.length === 0} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">
            Export CSV
          </button>
        </div>
        {error && <div className="text-sm text-red-700">{error}</div>}
      </div>

      {/* Completion records (the audit trail) */}
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center">
          <p className="text-sm font-medium text-gray-700">Completion records</p>
          <span className="text-xs text-gray-400">{rows.length} shown</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No completion records match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Learner</th>
                  <th className="text-left px-4 py-2 font-medium">Branch</th>
                  <th className="text-left px-4 py-2 font-medium">State</th>
                  <th className="text-left px-4 py-2 font-medium">Course</th>
                  <th className="text-left px-4 py-2 font-medium">Score</th>
                  <th className="text-left px-4 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(r.completedAt).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <div className="text-gray-900">{r.agent.firstName} {r.agent.lastName}</div>
                      <div className="text-xs text-gray-400">{r.agent.email} · {r.agent.role}</div>
                    </td>
                    <td className="px-4 py-2 font-mono text-gray-700">{r.branchCode || r.agent.branchCode || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{r.agentState || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{r.course.title}</td>
                    <td className="px-4 py-2 text-gray-900 font-medium">{r.score}%</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
