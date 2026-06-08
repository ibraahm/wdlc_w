'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminAgent, AdminLocation, LocationInput } from '@/lib/api';
import { apiImportLocations, apiCreateLocation, apiUpdateLocation } from '@/lib/api';
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

const EMPTY_FORM: LocationInput = {
  businessName: '',
  addressLine: '',
  city: '',
  state: '',
  zip: '',
  country: 'USA',
  publicPhone: '',
};

function LocationForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: LocationInput;
  submitLabel: string;
  busy: boolean;
  onSubmit: (data: LocationInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<LocationInput>(initial);

  function set<K extends keyof LocationInput>(key: K, value: LocationInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.businessName.trim() || !form.city.trim() || !form.state.trim()) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={submit} className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={form.businessName}
          onChange={(e) => set('businessName', e.target.value)}
          placeholder="Business name *"
          required
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <input
          value={form.publicPhone ?? ''}
          onChange={(e) => set('publicPhone', e.target.value)}
          placeholder="Phone"
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <input
          value={form.addressLine ?? ''}
          onChange={(e) => set('addressLine', e.target.value)}
          placeholder="Street address"
          className="px-3 py-2 border border-gray-300 rounded text-sm md:col-span-2"
        />
        <input
          value={form.city}
          onChange={(e) => set('city', e.target.value)}
          placeholder="City *"
          required
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
            placeholder="State *"
            required
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <input
            value={form.zip ?? ''}
            onChange={(e) => set('zip', e.target.value)}
            placeholder="ZIP"
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        <input
          value={form.country ?? ''}
          onChange={(e) => set('country', e.target.value)}
          placeholder="Country"
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        />
      </div>
      <p className="text-xs text-gray-400">
        The address is geocoded automatically so the pin appears on the public map.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-1.5 bg-navy text-white text-xs font-medium rounded disabled:opacity-60"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 border border-gray-300 text-gray-700 text-xs rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function LocationsList({
  locations,
  accessToken,
}: {
  locations: AdminLocation[];
  accessToken: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; geocoded: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setImportResult(null);
    setBusy(true);
    try {
      const result = await apiImportLocations(accessToken, file);
      setImportResult(result);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleCreate(data: LocationInput) {
    setError('');
    setBusy(true);
    try {
      await apiCreateLocation(accessToken, data);
      setAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(id: string, data: LocationInput) {
    setError('');
    setBusy(true);
    try {
      await apiUpdateLocation(accessToken, id, data);
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => { setAdding((v) => !v); setEditingId(null); }}
          className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-mid transition-colors"
        >
          {adding ? 'Cancel' : '+ Add location'}
        </button>
        <label className="cursor-pointer px-4 py-2 border border-blue-300 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
          {busy ? 'Working…' : 'Import from Excel / CSV'}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={busy}
            onChange={handleImport}
          />
        </label>
        <span className="text-xs text-gray-400">
          Excel columns: Business Name, City, State (required); Address, ZIP, Phone, Country, ID (optional)
        </span>
      </div>

      {importResult && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
          Import complete — {importResult.created} created, {importResult.updated} updated, {importResult.geocoded} geocoded.
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {adding && (
        <LocationForm
          initial={EMPTY_FORM}
          submitLabel="Add location"
          busy={busy}
          onSubmit={handleCreate}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Table */}
      {locations.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">
          No locations yet. Add one manually or import an Excel file above.
        </p>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Coords</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) =>
                editingId === loc.id ? (
                  <tr key={loc.id} className="bg-blue-50">
                    <td colSpan={5} className="px-4 py-3">
                      <LocationForm
                        initial={{
                          businessName: loc.businessName,
                          addressLine: loc.addressLine ?? '',
                          city: loc.city,
                          state: loc.state,
                          zip: loc.zip ?? '',
                          country: loc.country ?? 'USA',
                          publicPhone: loc.publicPhone ?? '',
                          active: loc.active,
                        }}
                        submitLabel="Save changes"
                        busy={busy}
                        onSubmit={(data) => handleUpdate(loc.id, data)}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
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
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => { setEditingId(loc.id); setAdding(false); }}
                          className="text-xs text-navy hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(loc.id)}
                          disabled={isPending}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400">
        Active locations with resolved coordinates appear on the public <strong>Find an Agent</strong> map.
      </p>
    </div>
  );
}

function AgentAccounts({ agents }: { agents: AdminAgent[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

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

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Portal agent accounts ({agents.length})</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Self-registered agents — approve accounts and optionally list their own address on the map.
          </p>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {agents.length === 0 ? (
            <p className="text-sm text-gray-500">No agents have registered yet.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Agent</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">On map</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-gray-900">{a.firstName} {a.lastName}</div>
                        <div className="text-gray-400 text-xs">{a.email}</div>
                        {!a.emailVerified && (
                          <span className="inline-block mt-1 text-[11px] text-orange-600">email not verified</span>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
  return (
    <div className="space-y-6">
      <LocationsList locations={locations} accessToken={accessToken} />
      <AgentAccounts agents={agents} />
    </div>
  );
}
