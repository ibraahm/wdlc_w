'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminLocation, LocationInput } from '@/lib/api';
import { apiImportLocations, apiCreateLocation, apiUpdateLocation } from '@/lib/api';
import { toggleLocationActiveAction, deleteLocationAction } from '@/lib/actions';

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
          className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white"
        />
        <input
          value={form.publicPhone ?? ''}
          onChange={(e) => set('publicPhone', e.target.value)}
          placeholder="Phone"
          className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white"
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
          className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
            placeholder="State *"
            required
            className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white"
          />
          <input
            value={form.zip ?? ''}
            onChange={(e) => set('zip', e.target.value)}
            placeholder="ZIP"
            className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white"
          />
        </div>
        <input
          value={form.country ?? ''}
          onChange={(e) => set('country', e.target.value)}
          placeholder="Country"
          className="px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white"
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

export default function AgentsManager({
  locations,
  accessToken,
}: {
  locations: AdminLocation[];
  accessToken: string;
}) {
  return <LocationsList locations={locations} accessToken={accessToken} />;
}
