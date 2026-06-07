'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminAgent } from '@/lib/api';
import { setAgentStatusAction, setAgentVisibilityAction } from '@/lib/actions';

const STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'];

function statusClasses(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'SUSPENDED':
      return 'bg-orange-100 text-orange-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function AgentsManager({ agents }: { agents: AdminAgent[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function changeStatus(id: string, status: string) {
    setError('');
    startTransition(async () => {
      const res = await setAgentStatusAction(id, status);
      if (!res.ok) setError(res.error ?? 'Update failed');
      else router.refresh();
    });
  }

  function toggleVisibility(id: string, showOnMap: boolean) {
    setError('');
    startTransition(async () => {
      const res = await setAgentVisibilityAction(id, showOnMap);
      if (!res.ok) setError(res.error ?? 'Update failed');
      else router.refresh();
    });
  }

  if (agents.length === 0) {
    return <p className="text-sm text-gray-500">No agents have registered yet.</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Listing</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">On map</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => {
              const hasCoords = a.latitude != null && a.longitude != null;
              return (
                <tr key={a.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-gray-900">
                      {a.firstName} {a.lastName}
                    </div>
                    <div className="text-gray-400 text-xs">{a.email}</div>
                    {!a.emailVerified && (
                      <span className="inline-block mt-1 text-[11px] text-orange-600">
                        email not verified
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {a.businessName ? (
                      <>
                        <div className="text-gray-800">{a.businessName}</div>
                        <div className="text-gray-400 text-xs">
                          {[a.city, a.state].filter(Boolean).join(', ') || '—'}
                        </div>
                        {!hasCoords && (
                          <span className="inline-block mt-1 text-[11px] text-orange-600">
                            no map coordinates
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-300">No listing</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <select
                      value={a.status}
                      disabled={isPending}
                      onChange={(e) => changeStatus(a.id, e.target.value)}
                      className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer ${statusClasses(
                        a.status,
                      )}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={a.showOnMap}
                        disabled={isPending}
                        onChange={(e) => toggleVisibility(a.id, e.target.checked)}
                        className="w-4 h-4 accent-navy"
                      />
                      <span className="text-xs text-gray-600">
                        {a.showOnMap ? 'Visible' : 'Hidden'}
                      </span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        An agent appears on the public map only when status is <strong>ACTIVE</strong>,{' '}
        <strong>On map</strong> is enabled, and the listing has resolved map coordinates.
      </p>
    </div>
  );
}
