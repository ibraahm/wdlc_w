'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminAgent, AdminLocation } from '@/lib/api';
import { apiImportLocations } from '@/lib/api';
import {
  setAgentStatusAction,
  setAgentVisibilityAction,
  toggleLocationActiveAction,
  deleteLocationAction,
} from '@/lib/actions';

const STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'];

function statusClasses(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'SUSPENDED': return 'bg-orange-100 text-orange-800';
    case 'REJECTED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function PortalAgentsTab({
  agents,
}: {
  agents: AdminAgent[];
}) {
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
    return <p className="text-sm text-gray-500 py-4">No agents have registered yet.</p>;
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
                    <div className="font-medium text-gray-900">{a.firstName} {a.lastName}</div>
                    <div className="text-gray-400 text-xs">{a.email}</div>
                    {!a.emailVerified && (
                      <span className="inline-block mt-1 text-[11px] text-orange-600">email not verified</span>
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
                          <span className="inline-block mt-1 text-[11px] text-orange-600">no map coordinates</span>
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
                      className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer ${statusClasses(a.status)}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                      <span className="text-xs text-gray-600">{a.showOnMap ? 'Visible' : 'Hidden'}</span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        An agent appears on the public map only when status is <strong>ACTIVE</strong>, <strong>On map</strong> is enabled, and the listing has resolved map coordinates.
      </p>
    </div>
  );
}

function ImportedLocationsTab({
  locations,
  accessToken,
}: {
  locations: AdminLocation[];
  accessToken: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; geocoded: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setImportResult(null);
    setImporting(true);
    try {
      const result = await apiImportLocations(accessToken, file);
      setImportResult(result);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function toggleActive(id: string, active: boolean) {
    setError('');
    startTransition(async () => {
      const res = await toggleLocationActiveAction(id, active);
      if (!res.ok) setError(res.error ?? 'Update failed');
      else router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm('Delete this location?')) return;
    setError('');
    startTransition(async () => {
      const res = await deleteLocationAction(id);
      if (!res.ok) setError(res.error ?? 'Delete failed');
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Import section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
        <div>
          <h3 className="font-medium text-blue-900 text-sm">Import from Excel / CSV</h3>
          <p className="text-xs text-blue-700 mt-1">
            Upload an <strong>.xlsx</strong> or <strong>.csv</strong> file. Required columns: <strong>Business Name</strong>, <strong>City</strong>, <strong>State</strong>. Optional: Address, ZIP, Phone, Country, ID (for upserts).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
            {importing ? 'Importing…' : 'Choose file'}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={importing}
              onChange={handleImport}
            />
          </label>
          {importing && <span className="text-sm text-blue-600 animate-pulse">Geocoding addresses…</span>}
        </div>
        {importResult && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
            Import complete — {importResult.created} created, {importResult.updated} updated, {importResult.geocoded} geocoded.
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
      </div>

      {/* Locations table */}
      {locations.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No imported locations yet. Upload an Excel file above to get started.</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Coords</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-gray-900">{loc.businessName}</div>
                    {loc.publicPhone && <div className="text-gray-400 text-xs">{loc.publicPhone}</div>}
                  </td>
                  <td className="px-4 py-3 align-top text-gray-700">
                    <div>{loc.addressLine || '—'}</div>
                    <div className="text-gray-400 text-xs">
                      {[loc.city, loc.state, loc.zip].filter(Boolean).join(', ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs">
                    {loc.latitude != null ? (
                      <span className="text-green-700">{loc.latitude.toFixed(4)}, {loc.longitude!.toFixed(4)}</span>
                    ) : (
                      <span className="text-orange-500">No coords</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loc.active}
                        disabled={isPending}
                        onChange={(e) => toggleActive(loc.id, e.target.checked)}
                        className="w-4 h-4 accent-navy"
                      />
                      <span className="text-xs text-gray-600">{loc.active ? 'Active' : 'Hidden'}</span>
                    </label>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      onClick={() => remove(loc.id)}
                      disabled={isPending}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
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

export default function AgentsManager({
  agents,
  locations,
  accessToken,
}: {
  agents: AdminAgent[];
  locations: AdminLocation[];
  accessToken: string;
}) {
  const [tab, setTab] = useState<'portal' | 'imported'>('portal');

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([['portal', 'Portal Agents', agents.length], ['imported', 'Imported Locations', locations.length]] as const).map(
          ([id, label, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs rounded-full bg-gray-100 text-gray-600 px-1.5 py-0.5">
                {count}
              </span>
            </button>
          ),
        )}
      </div>

      {tab === 'portal' ? (
        <PortalAgentsTab agents={agents} />
      ) : (
        <ImportedLocationsTab locations={locations} accessToken={accessToken} />
      )}
    </div>
  );
}
