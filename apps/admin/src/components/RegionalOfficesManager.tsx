'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { RegionalOffice, RegionalOfficeInput } from '@/lib/api';
import { createRegionalOfficeAction, updateRegionalOfficeAction, deleteRegionalOfficeAction } from '@/lib/actions';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const EMPTY: RegionalOfficeInput = { code: '', name: '', states: '', contactEmail: '', contactPhone: '', active: true };

function OfficeForm({ initial, submitLabel, busy, onSubmit, onCancel }: {
  initial: RegionalOfficeInput; submitLabel: string; busy: boolean;
  onSubmit: (d: RegionalOfficeInput) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<RegionalOfficeInput>(initial);
  function set<K extends keyof RegionalOfficeInput>(k: K, v: RegionalOfficeInput[K]) { setForm((f) => ({ ...f, [k]: v })); }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code?.trim() || !form.name?.trim()) return;
    onSubmit(form);
  }
  return (
    <form onSubmit={submit} className="space-y-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Office code *</label>
          <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} required placeholder="RO-SE" className={`${inputCls} font-mono`} />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Name *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Southeast Regional Office" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>States covered (2-letter codes, comma-separated)</label>
        <input value={form.states || ''} onChange={(e) => set('states', e.target.value)} placeholder="GA, FL, AL, SC" className={inputCls} />
        <p className="text-xs text-gray-400 mt-1">Agents whose state is listed here are auto-assigned to this office.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Contact email</label>
          <input value={form.contactEmail || ''} onChange={(e) => set('contactEmail', e.target.value)} placeholder="se-office@worlddirectlink.com" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Contact phone</label>
          <input value={form.contactPhone || ''} onChange={(e) => set('contactPhone', e.target.value)} placeholder="(800) 555-0100" className={inputCls} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={form.active ?? true} onChange={(e) => set('active', e.target.checked)} />
        Active (inactive offices are skipped during auto-assignment)
      </label>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 bg-white">Cancel</button>
        <button type="submit" disabled={busy} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function RegionalOfficesManager({ offices, canManage }: { offices: RegionalOffice[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function handleCreate(data: RegionalOfficeInput) {
    setError('');
    startTransition(async () => {
      const res = await createRegionalOfficeAction(data);
      if (res.ok) { setCreating(false); router.refresh(); } else setError(res.error ?? 'Create failed');
    });
  }
  function handleUpdate(id: string, data: RegionalOfficeInput) {
    setError('');
    startTransition(async () => {
      const res = await updateRegionalOfficeAction(id, data);
      if (res.ok) { setEditingId(null); router.refresh(); } else setError(res.error ?? 'Update failed');
    });
  }
  function handleDelete(id: string, code: string) {
    if (!confirm(`Delete office ${code}? Agents and users assigned to it will be unassigned (not deleted).`)) return;
    setError('');
    startTransition(async () => {
      const res = await deleteRegionalOfficeAction(id);
      if (res.ok) router.refresh(); else setError(res.error ?? 'Delete failed');
    });
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {canManage && !creating && (
        <div className="flex justify-end">
          <button onClick={() => setCreating(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">+ New Office</button>
        </div>
      )}
      {creating && (
        <OfficeForm initial={EMPTY} submitLabel="Create Office" busy={isPending} onSubmit={handleCreate} onCancel={() => setCreating(false)} />
      )}

      {offices.length === 0 && !creating ? (
        <div className="border border-dashed border-gray-300 rounded-lg py-12 text-center text-gray-400 text-sm">
          No regional offices yet. Create one and assign the states it covers.
        </div>
      ) : (
        <div className="space-y-3">
          {offices.map((o) =>
            editingId === o.id ? (
              <OfficeForm key={o.id} initial={{ code: o.code, name: o.name, states: o.states || '', contactEmail: o.contactEmail || '', contactPhone: o.contactPhone || '', active: o.active }}
                submitLabel="Save Changes" busy={isPending} onSubmit={(d) => handleUpdate(o.id, d)} onCancel={() => setEditingId(null)} />
            ) : (
              <div key={o.id} className="flex items-start gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-navy/5 text-navy font-semibold">{o.code}</span>
                    <span className="font-medium text-gray-900">{o.name}</span>
                    {!o.active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Inactive</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 space-x-2">
                    <span>States: {o.states || '—'}</span>
                    <span>· {o.agentCount ?? 0} agents</span>
                    {o.contactEmail && <span>· {o.contactEmail}</span>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditingId(o.id)} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Edit</button>
                    <button onClick={() => handleDelete(o.id, o.code)} disabled={isPending} className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50">Delete</button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
