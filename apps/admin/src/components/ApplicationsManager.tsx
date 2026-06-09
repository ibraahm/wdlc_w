'use client';

import { Fragment, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AgentApplication } from '@/lib/api';
import { setApplicationStatusAction, deleteApplicationAction } from '@/lib/actions';
import { EmptyState } from './ui-admin';

const STATUSES = ['NEW', 'REVIEWING', 'APPROVED', 'REJECTED'];

function statusClasses(status: string): string {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-800';
    case 'REVIEWING': return 'bg-yellow-100 text-yellow-800';
    case 'REJECTED': return 'bg-red-100 text-red-800';
    default: return 'bg-blue-100 text-blue-800';
  }
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800">{value}</dd>
    </div>
  );
}

export default function ApplicationsManager({ applications }: { applications: AgentApplication[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  function changeStatus(id: string, status: string) {
    setError('');
    startTransition(async () => {
      const res = await setApplicationStatusAction(id, status);
      if (!res.ok) setError(res.error ?? 'Update failed');
      else router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm('Delete this application?')) return;
    setError('');
    startTransition(async () => {
      const res = await deleteApplicationAction(id);
      if (!res.ok) setError(res.error ?? 'Delete failed');
      else router.refresh();
    });
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        icon="✉"
        title="No agent applications yet"
        description="Submissions from the public “Become an Agent” form will appear here for review. Approving an application opens its due-diligence file automatically."
        actionHref="/agent-dd"
        actionLabel="Go to Due Diligence"
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Applicant</th>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <Fragment key={a.id}>
                <tr className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-gray-900">{a.firstName} {a.lastName}</div>
                    <div className="text-gray-400 text-xs">{a.email}</div>
                    <div className="text-gray-400 text-xs">{a.businessPhone}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className={`inline-block mb-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${a.applicantType === 'INDIVIDUAL' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                      {a.applicantType === 'INDIVIDUAL' ? 'Individual' : 'Business'}
                    </span>
                    <div className="text-gray-800">{a.company || '—'}</div>
                    <div className="text-gray-400 text-xs">
                      {[a.businessCity, a.businessState, a.businessCountry].filter(Boolean).join(', ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-gray-500 text-xs">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <select
                      value={a.status}
                      disabled={isPending}
                      onChange={(e) => changeStatus(a.id, e.target.value)}
                      className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer ${statusClasses(a.status)}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                        className="text-xs text-navy hover:underline"
                      >
                        {expanded === a.id ? 'Hide' : 'View'}
                      </button>
                      <button
                        onClick={() => remove(a.id)}
                        disabled={isPending}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === a.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-4">
                      <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                        <Detail label="Business street" value={a.businessStreet} />
                        <Detail label="ZIP / Postal" value={a.businessZip} />
                        <Detail label="How they found us" value={a.howFound === 'Other' ? a.howFoundOther : a.howFound} />
                        <Detail label="Business type" value={a.businessType === 'Other' ? a.businessTypeOther : a.businessType} />
                        <Detail label="Products to offer" value={a.productsOffered} />
                        <Detail
                          label="Currently provides MT"
                          value={a.currentlyProvides ? (a.currentProvider === 'Other' ? a.currentProviderOther : a.currentProvider) || 'Yes' : 'No'}
                        />
                        <Detail
                          label="Provided MT in past"
                          value={a.providedPast ? (a.pastProvider === 'Other' ? a.pastProviderOther : a.pastProvider) || 'Yes' : 'No'}
                        />
                        <Detail label="Declined before" value={a.declinedBefore ? `Yes — ${a.declinedExplain ?? ''}` : 'No'} />
                        <Detail label="Preferred language" value={a.preferredLanguage === 'Other' ? a.preferredLanguageOther : a.preferredLanguage} />
                        <Detail label="Monthly volume" value={a.monthlyVolume} />
                        <Detail label="Total locations" value={a.totalLocations} />
                      </dl>
                      {a.comments && (
                        <div className="mt-3">
                          <dt className="text-xs text-gray-400">Comments</dt>
                          <dd className="text-sm text-gray-800 whitespace-pre-wrap">{a.comments}</dd>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
