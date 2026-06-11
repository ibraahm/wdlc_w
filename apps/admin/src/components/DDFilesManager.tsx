'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DDFile, DDDashboard } from '@/lib/api';
import { createDDFileAction } from '@/lib/actions';
import { EmptyState } from './ui-admin';

const STAGES = ['APPLICATION', 'UNDER_REVIEW', 'DD_IN_PROGRESS', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'REJECTED'];

function stageClasses(stage: string): string {
  switch (stage) {
    case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
    case 'DD_IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'SUSPENDED': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'TERMINATED':
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function riskClasses(r: string | null): string {
  switch (r) {
    case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-500 border-gray-200';
  }
}

function ownerName(f: DDFile) {
  return f.application ? `${f.application.firstName} ${f.application.lastName}`.trim() : '';
}

function addressLine(f: DDFile) {
  const app = f.application;
  if (!app) return '';
  return [
    app.businessStreet,
    [app.businessCity, app.businessState, app.businessZip].filter(Boolean).join(', '),
    app.businessCountry,
  ].filter(Boolean).join(' - ');
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not set';
}

function matchesQuery(file: DDFile, query: string) {
  if (!query) return true;
  return [
    file.agentName,
    file.entityType,
    file.stage,
    file.riskRating,
    file.states,
    ownerName(file),
    addressLine(file),
    file.application?.status,
  ].filter(Boolean).join(' ').toLowerCase().includes(query);
}

function SummaryBadges({ file }: { file: DDFile }) {
  if (!file.summary) return <span className="text-xs text-gray-400">No checklist data</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {file.summary.EXPIRED ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">{file.summary.EXPIRED} expired</span>
      ) : null}
      {file.summary.EXPIRING ? (
        <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-700">{file.summary.EXPIRING} expiring</span>
      ) : null}
      {file.summary.MISSING ? (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{file.summary.MISSING} missing</span>
      ) : null}
      {file.compliant ? (
        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Complete</span>
      ) : null}
      {!file.summary.EXPIRED && !file.summary.EXPIRING && !file.summary.MISSING && !file.compliant ? (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">In progress</span>
      ) : null}
    </div>
  );
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
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState('BUSINESS');

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: initialFiles.length };
    for (const stage of STAGES) counts[stage] = 0;
    for (const file of initialFiles) counts[file.stage] = (counts[file.stage] ?? 0) + 1;
    return counts;
  }, [initialFiles]);

  const files = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialFiles.filter((file) => {
      if (stageFilter && file.stage !== stageFilter) return false;
      return matchesQuery(file, q);
    });
  }, [initialFiles, query, stageFilter]);

  function create() {
    if (!name.trim()) {
      setError('Agent name is required');
      return;
    }

    setError('');
    startTransition(async () => {
      const res = await createDDFileAction({ agentName: name.trim(), entityType });
      if (!res.ok) {
        setError(res.error ?? 'Create failed');
        return;
      }

      setShowCreate(false);
      setName('');
      if (res.id) router.push(`/agent-dd/${res.id}`);
    });
  }

  return (
    <div className="space-y-5">
      {dashboard && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Expired docs" value={dashboard.expired} tone="red" />
          <Stat label="Expiring <=60d" value={dashboard.expiring} tone="yellow" />
          <Stat label="Missing docs" value={dashboard.missing} tone="gray" />
          <Stat label="Reviews due" value={dashboard.reviewsDue} tone="blue" />
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Due-diligence files</h2>
            <p className="text-xs text-gray-400">
              {files.length} shown of {initialFiles.length} total. Use search and stage filters before opening a file.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search agent, owner, address, risk"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-72"
            />
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All stages ({stageCounts.ALL})</option>
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage.replace(/_/g, ' ')} ({stageCounts[stage] ?? 0})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCreate((value) => !value)}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-mid"
            >
              {showCreate ? 'Cancel' : 'New DD file'}
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="mt-4 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-[1fr_220px_auto] md:items-end">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Agent / business name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Entity type</span>
              <select
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="BUSINESS">Business</option>
                <option value="INDIVIDUAL">Individual</option>
              </select>
            </label>
            <button
              type="button"
              onClick={create}
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {initialFiles.length === 0 ? (
        <EmptyState
          icon="DD"
          title="No due-diligence files yet"
          description="A DD file opens automatically when an agent application is approved, or you can create one manually. Each file tracks the checklist, expiries, risk rating, and review cycle."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <caption className="sr-only">Agent due-diligence files</caption>
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Origin</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Checklist</th>
                  <th className="px-4 py-3">Next review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                      No DD files match the current filters.
                    </td>
                  </tr>
                )}
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 align-top">
                      <Link href={`/agent-dd/${file.id}`} className="font-semibold text-gray-900 hover:text-navy hover:underline">
                        {file.agentName}
                      </Link>
                      <div className="mt-1 text-xs text-gray-500">
                        {ownerName(file) ? `Owner: ${ownerName(file)}` : file.entityType}
                        {file.states ? ` - ${file.states}` : ''}
                      </div>
                      {addressLine(file) && (
                        <div className="mt-1 max-w-md text-xs leading-5 text-gray-400">{addressLine(file)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      {file.application ? (
                        <>
                          <Link href={`/applications?application=${file.application.id}`} className="font-semibold text-navy hover:underline">
                            Application
                          </Link>
                          <div className="mt-1 text-gray-400">
                            {file.application.status} - {new Date(file.application.createdAt).toLocaleDateString()}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">Manual file</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${stageClasses(file.stage)}`}>
                        {file.stage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${riskClasses(file.riskRating)}`}>
                        {file.riskRating ?? 'Not set'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <SummaryBadges file={file} />
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600">
                      {formatDate(file.nextReviewDueAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'red' | 'yellow' | 'gray' | 'blue' }) {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-700',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    gray: 'border-gray-200 bg-white text-gray-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  }[tone];

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${tones}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs font-medium">{label}</div>
    </div>
  );
}
