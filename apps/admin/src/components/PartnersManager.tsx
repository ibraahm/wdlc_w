'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Partner } from '@/lib/api';
import { createPartnerAction, updatePartnerAction, deletePartnerAction } from '@/lib/actions';

const TYPES = ['CORRESPONDENT', 'BANKING', 'TECHNOLOGY', 'OTHER'];

const TYPE_LABELS: Record<string, string> = {
  CORRESPONDENT: 'Correspondent',
  BANKING: 'Banking',
  TECHNOLOGY: 'Technology',
  OTHER: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  CORRESPONDENT: 'bg-blue-100 text-blue-700',
  BANKING: 'bg-emerald-100 text-emerald-700',
  TECHNOLOGY: 'bg-violet-100 text-violet-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const BLANK: Partial<Partner> = {
  name: '', type: 'CORRESPONDENT', description: '', website: '', region: '',
  featured: false, active: true, order: 0,
};

export default function PartnersManager({ partners }: { partners: Partner[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Partial<Partner>>(BLANK);

  function openNew() { setForm(BLANK); setEditId('new'); setError(''); }
  function openEdit(p: Partner) { setForm({ ...p }); setEditId(p.id); setError(''); }
  function close() { setEditId(null); setError(''); }

  function set(field: keyof Partner, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function save() {
    if (!form.name?.trim()) { setError('Name is required.'); return; }
    setError('');
    startTransition(async () => {
      const res = editId === 'new'
        ? await createPartnerAction(form)
        : await updatePartnerAction(editId!, form);
      if (!res.ok) { setError(res.error ?? 'Save failed'); return; }
      close();
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Remove partner "${name}"?`)) return;
    setError('');
    startTransition(async () => {
      const res = await deletePartnerAction(id);
      if (!res.ok) setError(res.error ?? 'Delete failed');
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-end">
        <button onClick={openNew} className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          + Add partner
        </button>
      </div>

      {/* Editor panel */}
      {editId && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">{editId === 'new' ? 'New partner' : 'Edit partner'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="e.g. Taaj Financial Services" />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type ?? 'CORRESPONDENT'} onChange={(e) => set('type', e.target.value)} className={inputCls}>
                {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Region</label>
              <input value={form.region ?? ''} onChange={(e) => set('region', e.target.value)} className={inputCls} placeholder="e.g. East Africa" />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} className={inputCls} placeholder="https://..." />
            </div>
            <div>
              <label className={labelCls}>Logo URL</label>
              <input value={form.logoUrl ?? ''} onChange={(e) => set('logoUrl', e.target.value)} className={inputCls} placeholder="https://..." />
            </div>
            <div>
              <label className={labelCls}>Display order</label>
              <input type="number" value={form.order ?? 0} onChange={(e) => set('order', parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={2} className={inputCls} placeholder="Brief description of the partnership…" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!form.featured} onChange={(e) => set('featured', e.target.checked)} />
              Featured (shown prominently)
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!form.active} onChange={(e) => set('active', e.target.checked)} />
              Active (visible on website)
            </label>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={save} disabled={isPending} className="rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button onClick={close} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      {partners.length === 0 && !editId ? (
        <p className="text-sm text-gray-500">No partners yet. Add one to get started.</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Partner</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Flags</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className={`border-b border-gray-100 last:border-0 ${!p.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.description && <div className="text-gray-400 text-xs line-clamp-1">{p.description}</div>}
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-navy hover:underline">{p.website}</a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[p.type] ?? TYPE_COLORS.OTHER}`}>
                      {TYPE_LABELS[p.type] ?? p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.region || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.featured && <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">Featured</span>}
                      {!p.active && <span className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-[10px] font-semibold">Hidden</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(p)} className="text-xs text-navy hover:underline">Edit</button>
                      <button onClick={() => remove(p.id, p.name)} disabled={isPending} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </div>
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
