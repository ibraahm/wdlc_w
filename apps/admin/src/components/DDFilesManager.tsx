'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DDFile, DDDashboard } from '@/lib/api';
import { createDDFileAction } from '@/lib/actions';
import { EmptyState } from './ui-admin';

const STAGES = ['APPLICATION', 'UNDER_REVIEW', 'DD_IN_PROGRESS', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'REJECTED'];

function stageClasses(stage: string): string {
  switch (stage) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'DD_IN_PROGRESS': return 'bg-blue-100 text-blue-800';
    case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800';
    case 'SUSPENDED': return 'bg-orange-100 text-orange-800';
    case 'TERMINATED':
    case 'REJECTED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function riskClasses(r: string | null): string {
  switch (r) {
    case 'HIGH': return 'bg-red-100 text-red-800';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
    case 'LOW': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-500';
  }
}

export default function DDFilesManager({
  initialFiles,
  dashboard,
}: {
  initialFiles: DDFile[];
  dashboard: DDDashboard | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState('BUSINESS');

  const files = stageFilter ? initialFiles.filter((f) => f.stage === stageFilter) : initialFiles;

  function create() {
    if (!name.trim()) { setError('Agent name is required'); return; }
    setError('');
    startTransition(async () => {
      const res = await createDDFileAction({ agentName: name.trim(), entityType });
      if (!res.ok) setError(res.error ?? 'Create failed');
      else { setShowCreate(false); setName(''); if (res.id) router.push(`/agent-dd/${res.id}`); }
    });
  }

  return (
    <div className="space-y-6">
      {/* Attention dashboard */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Expired docs" value={dashboard.expired} tone="red" />
          <Stat label="Expiring (≤60d)" value={dashboard.expiring} tone="yellow" />
          <Stat label="Missing docs" value={dashboard.missing} tone="gray" />
          <Stat label="Reviews due" value={dashboard.reviewsDue} tone="blue" />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {showCreate ? 'Cancel' : '+ New DD file'}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Agent / business name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Entity type</label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="BUSINESS">Business</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
          </div>
          <button onClick={create} disabled={isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Create
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {initialFiles.length === 0 ? (
        <EmptyState
          icon="✔"
          title="No due-diligence files yet"
          description="A DD file opens automatically when you approve an agent application, or create one here manually. Each file tracks the 19-item checklist, expiries, risk rating, and the review cycle."
        />
      ) : (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Agent</th>
              <th className="px-4 py-2">Stage</th>
              <th className="px-4 py-2">Risk</th>
              <th className="px-4 py-2">DD status</th>
              <th className="px-4 py-2">Next review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {files.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No DD files yet.</td></tr>
            )}
            {files.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/agent-dd/${f.id}`} className="font-medium text-gray-900 hover:underline">
                    {f.agentName}
                  </Link>
                  <div className="text-xs text-gray-400">{f.entityType}{f.states ? ` · ${f.states}` : ''}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${stageClasses(f.stage)}`}>{f.stage.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${riskClasses(f.riskRating)}`}>{f.riskRating ?? '—'}</span>
                </td>
                <td className="px-4 py-3">
                  {f.summary ? (
                    <span className="text-xs">
                      {f.summary.EXPIRED ? <span className="text-red-600 font-semibold mr-2">{f.summary.EXPIRED} expired</span> : null}
                      {f.summary.EXPIRING ? <span className="text-yellow-700 mr-2">{f.summary.EXPIRING} expiring</span> : null}
                      {f.summary.MISSING ? <span className="text-gray-500 mr-2">{f.summary.MISSING} missing</span> : null}
                      {f.compliant ? <span className="text-green-700">Complete</span> : null}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {f.nextReviewDueAt ? new Date(f.nextReviewDueAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'red' | 'yellow' | 'gray' | 'blue' }) {
  const tones = {
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }[tone];
  return (
    <div className={`rounded-lg border px-4 py-3 ${tones}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
