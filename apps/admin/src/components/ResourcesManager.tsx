'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Resource, ResourceInput } from '@/lib/api';
import { createResourceAction, updateResourceAction, deleteResourceAction } from '@/lib/actions';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const EMPTY: ResourceInput = {
  title: '', category: 'General', description: '', url: '', audience: 'ALL', targetStates: '', targetBranches: '', status: 'DRAFT', order: 0,
};

function ResourceForm({
  initial, submitLabel, busy, onSubmit, onCancel,
}: {
  initial: ResourceInput; submitLabel: string; busy: boolean;
  onSubmit: (data: ResourceInput) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<ResourceInput>(initial);
  function set<K extends keyof ResourceInput>(key: K, value: ResourceInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    onSubmit(form);
  }
  return (
    <form onSubmit={submit} className="space-y-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Title *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="Document title" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Forms, Policies" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Link / URL *</label>
        <input value={form.url} onChange={(e) => set('url', e.target.value)} required placeholder="https://… (Dropbox, PDF, etc.)" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <input value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="What this document is" className={inputCls} />
      </div>

      <div className="space-y-3">
        <label className={labelCls} style={{ marginBottom: 0 }}>Who can see this resource</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { value: 'ALL', label: 'Everyone', desc: 'All agents and tellers' },
            { value: 'STATE', label: 'Certain states', desc: 'Only branches in chosen states' },
            { value: 'AGENT', label: 'Certain agents', desc: 'Only specific branch codes' },
          ].map((c) => {
            const active = form.audience === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => set('audience', c.value)}
                className={`text-left rounded-lg border p-3 transition ${active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full border-2 ${active ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`} />
                  <span className="text-sm font-medium text-gray-900">{c.label}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{c.desc}</p>
              </button>
            );
          })}
        </div>
        {form.audience === 'STATE' && (
          <div>
            <label className={labelCls}>Which states? 2-letter codes, separated by commas.</label>
            <input value={form.targetStates || ''} onChange={(e) => set('targetStates', e.target.value)} placeholder="e.g. GA, TX, FL" className={inputCls} />
          </div>
        )}
        {form.audience === 'AGENT' && (
          <div>
            <label className={labelCls}>Which agents? Branch codes, separated by commas.</label>
            <input value={form.targetBranches || ''} onChange={(e) => set('targetBranches', e.target.value)} placeholder="e.g. uswdlc, abc123" className={inputCls} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Display order</label>
          <input type="number" value={form.order ?? 0} onChange={(e) => set('order', Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={busy} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

const AUDIENCE_LABEL: Record<string, string> = { ALL: 'Everyone', STATE: 'By state', AGENT: 'By agent' };

export default function ResourcesManager({ resources }: { resources: Resource[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function handleCreate(data: ResourceInput) {
    setError('');
    startTransition(async () => {
      const res = await createResourceAction(data);
      if (res.ok) { setCreating(false); router.refresh(); }
      else setError(res.error ?? 'Create failed');
    });
  }
  function handleUpdate(id: string, data: ResourceInput) {
    setError('');
    startTransition(async () => {
      const res = await updateResourceAction(id, data);
      if (res.ok) { setEditingId(null); router.refresh(); }
      else setError(res.error ?? 'Update failed');
    });
  }
  function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setError('');
    startTransition(async () => {
      const res = await deleteResourceAction(id);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Delete failed');
    });
  }

  function toInput(r: Resource): ResourceInput {
    return {
      title: r.title, category: r.category, description: r.description || '', url: r.url,
      audience: r.audience, targetStates: r.targetStates || '', targetBranches: r.targetBranches || '',
      status: r.status, order: r.order,
    };
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!creating && (
        <div className="flex justify-end">
          <button onClick={() => setCreating(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">+ New Resource</button>
        </div>
      )}

      {creating && (
        <ResourceForm initial={EMPTY} submitLabel="Create Resource" busy={isPending} onSubmit={handleCreate} onCancel={() => setCreating(false)} />
      )}

      {resources.length === 0 && !creating ? (
        <div className="border border-dashed border-gray-300 rounded-lg py-12 text-center text-gray-400 text-sm">
          No resources yet. Click "New Resource" to add one.
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) =>
            editingId === r.id ? (
              <ResourceForm key={r.id} initial={toInput(r)} submitLabel="Save Changes" busy={isPending} onSubmit={(d) => handleUpdate(r.id, d)} onCancel={() => setEditingId(null)} />
            ) : (
              <div key={r.id} className="flex items-start gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">{r.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{r.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{AUDIENCE_LABEL[r.audience] ?? r.audience}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">{r.url}</a>
                  </div>
                  {r.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{r.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditingId(r.id)} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Edit</button>
                  <button onClick={() => handleDelete(r.id, r.title)} disabled={isPending} className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50">Delete</button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
