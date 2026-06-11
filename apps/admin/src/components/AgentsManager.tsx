'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AdminLocation, LocationInput } from '@/lib/api';
import { apiImportLocations, apiCreateLocation, apiUpdateLocation } from '@/lib/api';
import { toggleLocationActiveAction, deleteLocationAction } from '@/lib/actions';
import { EmptyState } from './ui-admin';

const EMPTY_FORM: LocationInput = {
  businessName: '',
  addressLine: '',
  city: '',
  state: '',
  zip: '',
  country: 'USA',
  publicPhone: '',
};

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900';

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
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.businessName.trim() || !form.city.trim() || !form.state.trim()) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Business name</span>
          <input
            value={form.businessName}
            onChange={(event) => set('businessName', event.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Public phone</span>
          <input
            value={form.publicPhone ?? ''}
            onChange={(event) => set('publicPhone', event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Street address</span>
          <input
            value={form.addressLine ?? ''}
            onChange={(event) => set('addressLine', event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">City</span>
          <input
            value={form.city}
            onChange={(event) => set('city', event.target.value)}
            required
            className={inputClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">State</span>
            <input
              value={form.state}
              onChange={(event) => set('state', event.target.value)}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">ZIP</span>
            <input
              value={form.zip ?? ''}
              onChange={(event) => set('zip', event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Country</span>
          <input
            value={form.country ?? ''}
            onChange={(event) => set('country', event.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <p className="text-xs text-gray-400">The address is geocoded automatically so the pin can appear on the public map.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function LocationStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-xs font-medium text-gray-500">{label}</div>
    </div>
  );
}

function locationText(location: AdminLocation) {
  return [
    location.businessName,
    location.publicPhone,
    location.addressLine,
    location.city,
    location.state,
    location.zip,
    location.country,
  ].filter(Boolean).join(' ').toLowerCase();
}

function LocationsList({
  locations,
  accessToken,
}: {
  locations: AdminLocation[];
  accessToken: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasPrefill = searchParams.has('businessName');
  const initialPrefill: LocationInput = {
    businessName: searchParams.get('businessName') ?? '',
    addressLine: searchParams.get('addressLine') ?? '',
    city: searchParams.get('city') ?? '',
    state: searchParams.get('state') ?? '',
    zip: searchParams.get('zip') ?? '',
    country: searchParams.get('country') || 'USA',
    publicPhone: searchParams.get('phone') ?? '',
  };
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(hasPrefill);
  const [newLocationInitial, setNewLocationInitial] = useState<LocationInput>(
    hasPrefill ? initialPrefill : EMPTY_FORM,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | 'ACTIVE' | 'HIDDEN' | 'UNPINNED'>('ALL');
  const [importResult, setImportResult] = useState<{ created: number; updated: number; geocoded: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeCount = useMemo(() => locations.filter((location) => location.active).length, [locations]);
  const geocodedCount = useMemo(() => locations.filter((location) => location.latitude != null && location.longitude != null).length, [locations]);
  const hiddenCount = locations.length - activeCount;

  const visibleLocations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locations.filter((location) => {
      if (visibilityFilter === 'ACTIVE' && !location.active) return false;
      if (visibilityFilter === 'HIDDEN' && location.active) return false;
      if (visibilityFilter === 'UNPINNED' && location.latitude != null && location.longitude != null) return false;
      return !q || locationText(location).includes(q);
    });
  }, [locations, query, visibilityFilter]);

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
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
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <LocationStat label="Total locations" value={locations.length} />
        <LocationStat label="Active on map" value={activeCount} />
        <LocationStat label="Hidden" value={hiddenCount} />
        <LocationStat label="Geocoded" value={geocodedCount} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Location publishing</h2>
            <p className="text-xs text-gray-400">
              {visibleLocations.length} shown of {locations.length}. Active, geocoded rows appear on the public map.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search business, city, state, phone"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:w-72"
            />
            <select
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value as typeof visibilityFilter)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All rows</option>
              <option value="ACTIVE">Active only</option>
              <option value="HIDDEN">Hidden only</option>
              <option value="UNPINNED">Missing coords</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setAdding((value) => {
                  const next = !value;
                  if (next && !hasPrefill) setNewLocationInitial(EMPTY_FORM);
                  return next;
                });
                setEditingId(null);
              }}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-mid"
            >
              {adding ? 'Cancel' : 'Add location'}
            </button>
            <label className="cursor-pointer rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50">
              {busy ? 'Working...' : 'Import CSV/XLSX'}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={busy}
                onChange={handleImport}
              />
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Import columns: Business Name, City, State are required; Address, ZIP, Phone, Country, and ID are optional.
        </p>
      </div>

      {importResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          Import complete: {importResult.created} created, {importResult.updated} updated, {importResult.geocoded} geocoded.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {adding && (
        <div className="space-y-2">
          {hasPrefill && (
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700">
              Prefilled from the onboarding file. Review the address, then save to publish this location when active.
            </p>
          )}
          <LocationForm
            initial={newLocationInitial}
            submitLabel="Add location"
            busy={busy}
            onSubmit={handleCreate}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {locations.length === 0 ? (
        <EmptyState
          icon="LO"
          title="No locations yet"
          description="Add one manually or import an Excel/CSV file. Active locations with coordinates appear on the public map."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <caption className="sr-only">Agent locations</caption>
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 font-semibold">Business</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Coords</th>
                  <th className="px-4 py-3 font-semibold">Map status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleLocations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      No locations match the current filters.
                    </td>
                  </tr>
                )}
                {visibleLocations.map((location) =>
                  editingId === location.id ? (
                    <tr key={location.id} className="bg-blue-50">
                      <td colSpan={5} className="px-4 py-3">
                        <LocationForm
                          initial={{
                            businessName: location.businessName,
                            addressLine: location.addressLine ?? '',
                            city: location.city,
                            state: location.state,
                            zip: location.zip ?? '',
                            country: location.country ?? 'USA',
                            publicPhone: location.publicPhone ?? '',
                            active: location.active,
                          }}
                          submitLabel="Save changes"
                          busy={busy}
                          onSubmit={(data) => handleUpdate(location.id, data)}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={location.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-gray-900">{location.businessName}</div>
                        {location.publicPhone && <div className="mt-1 text-xs text-gray-400">{location.publicPhone}</div>}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-700">
                        <div>{location.addressLine || 'Not set'}</div>
                        <div className="mt-1 text-xs text-gray-400">
                          {[location.city, location.state, location.zip].filter(Boolean).join(', ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs">
                        {location.latitude != null && location.longitude != null ? (
                          <span className="font-medium text-green-700">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                        ) : (
                          <span className="font-medium text-orange-600">Needs geocode</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={location.active}
                            disabled={isPending}
                            onChange={(event) => toggleActive(location.id, event.target.checked)}
                            className="h-4 w-4 accent-navy"
                          />
                          <span className="text-xs font-medium text-gray-600">{location.active ? 'Active' : 'Hidden'}</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => { setEditingId(location.id); setAdding(false); }}
                            className="text-xs font-semibold text-navy hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(location.id)}
                            disabled={isPending}
                            className="text-xs font-semibold text-red-500 transition-colors hover:text-red-700 disabled:opacity-50"
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
        </div>
      )}
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
