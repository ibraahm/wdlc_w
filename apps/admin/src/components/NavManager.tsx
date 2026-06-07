'use client';

import { useState, useTransition } from 'react';
import type { NavItem } from '@/lib/api';
import { createNavItemAction, updateNavItemAction, deleteNavItemAction } from '@/lib/actions';

interface NavManagerProps {
  initialItems: NavItem[];
}

const LOCATIONS = ['HEADER', 'FOOTER', 'SIDEBAR'];

function NavItemRow({
  item,
  indent = false,
  onDelete,
  parentId,
}: {
  item: NavItem;
  indent?: boolean;
  onDelete: (id: string) => void;
  parentId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('visible', fd.get('visible') === 'on' ? 'true' : 'false');
    startTransition(async () => {
      const result = await updateNavItemAction(fd);
      if (result.ok) { setEditing(false); setError(''); }
      else setError(result.error ?? 'Update failed');
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${item.label}"?`)) return;
    startTransition(async () => {
      const result = await deleteNavItemAction(item.id);
      if (result.ok) onDelete(item.id);
      else setError(result.error ?? 'Delete failed');
    });
  }

  function handleAddChild(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('parentId', item.id);
    fd.set('location', item.location);
    startTransition(async () => {
      const result = await createNavItemAction(fd);
      if (result.ok) { setAddingChild(false); window.location.reload(); }
      else setError(result.error ?? 'Add failed');
    });
  }

  return (
    <>
      {editing ? (
        <tr className="bg-blue-50">
          <td colSpan={5} className={indent ? 'pl-12 pr-4 py-3' : 'px-4 py-3'}>
            <form onSubmit={handleUpdate} className="space-y-2">
              <input type="hidden" name="id" value={item.id} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input name="label" defaultValue={item.label} required placeholder="Label" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                <input name="href" defaultValue={item.href} required placeholder="href" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                <select name="location" defaultValue={item.location} className="px-3 py-1.5 border border-gray-300 rounded text-sm">
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <input name="order" type="number" defaultValue={item.order} className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="visible" defaultChecked={item.visible} />
                Visible
              </label>
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={isPending} className="px-3 py-1 bg-navy text-white text-xs rounded disabled:opacity-60">{isPending ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded">Cancel</button>
              </div>
            </form>
          </td>
        </tr>
      ) : (
        <tr className={`hover:bg-gray-50 transition-colors ${indent ? 'bg-gray-50/50' : ''}`}>
          <td className={`py-2.5 text-sm font-medium text-gray-900 ${indent ? 'pl-12 pr-4' : 'px-6'}`}>
            {indent && <span className="text-gray-300 mr-2">└</span>}
            {item.label}
          </td>
          <td className="px-4 py-2.5 text-sm text-gray-500 font-mono">{item.href}</td>
          <td className="px-4 py-2.5 text-sm text-gray-400">{item.location}</td>
          <td className="px-4 py-2.5">
            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${item.visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {item.visible ? 'Visible' : 'Hidden'}
            </span>
          </td>
          <td className="px-4 py-2.5 text-right">
            <div className="flex items-center justify-end gap-3">
              {error && <span className="text-red-500 text-xs">{error}</span>}
              {!indent && (
                <button onClick={() => setAddingChild(true)} className="text-xs text-gold hover:underline">+ Child</button>
              )}
              <button onClick={() => setEditing(true)} className="text-xs text-navy hover:underline">Edit</button>
              <button onClick={handleDelete} disabled={isPending} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">Delete</button>
            </div>
          </td>
        </tr>
      )}

      {addingChild && (
        <tr className="bg-yellow-50">
          <td colSpan={5} className="pl-12 pr-4 py-3">
            <form onSubmit={handleAddChild} className="space-y-2">
              <p className="text-xs font-medium text-gray-600 mb-1">Add child under "{item.label}"</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <input name="label" required placeholder="Label *" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                <input name="href" required placeholder="href *" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
                <input name="order" type="number" defaultValue={(item.children?.length ?? 0)} placeholder="Order" className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
              </div>
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={isPending} className="px-3 py-1 bg-navy text-white text-xs rounded disabled:opacity-60">{isPending ? 'Adding…' : 'Add'}</button>
                <button type="button" onClick={() => setAddingChild(false)} className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded">Cancel</button>
              </div>
            </form>
          </td>
        </tr>
      )}

      {item.children?.map((child) => (
        <NavItemRow key={child.id} item={child} indent onDelete={onDelete} parentId={item.id} />
      ))}
    </>
  );
}

export default function NavManager({ initialItems }: NavManagerProps) {
  const [items, setItems] = useState<NavItem[]>(initialItems);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState('');
  const [isPending, startTransition] = useTransition();

  const totalCount = items.reduce((n, i) => n + 1 + (i.children?.length ?? 0), 0);

  function handleDelete(id: string) {
    setItems((prev) =>
      prev
        .filter((i) => i.id !== id)
        .map((i) => ({ ...i, children: i.children?.filter((c) => c.id !== id) }))
    );
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError('');
    const fd = new FormData(e.currentTarget);
    fd.set('visible', 'true');
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await createNavItemAction(fd);
      if (result.ok) { setShowAddForm(false); form.reset(); window.location.reload(); }
      else setAddError(result.error ?? 'Create failed');
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 text-sm">Nav items ({totalCount})</h2>
          <button onClick={() => setShowAddForm((v) => !v)} className="px-4 py-2 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-mid transition-colors">
            {showAddForm ? 'Cancel' : '+ Add top-level item'}
          </button>
        </div>

        {showAddForm && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <form onSubmit={handleAdd} className="space-y-3">
              <p className="text-xs font-medium text-gray-600">New top-level item</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input name="label" required placeholder="Label *" className="px-3 py-2 border border-gray-300 rounded text-sm" />
                <input name="href" required placeholder="href *" className="px-3 py-2 border border-gray-300 rounded text-sm" />
                <select name="location" className="px-3 py-2 border border-gray-300 rounded text-sm">
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <input name="order" type="number" defaultValue={items.length} placeholder="Order" className="px-3 py-2 border border-gray-300 rounded text-sm" />
              </div>
              {addError && <p className="text-red-600 text-xs">{addError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={isPending} className="px-4 py-1.5 bg-navy text-white text-xs font-medium rounded disabled:opacity-60">{isPending ? 'Adding…' : 'Add item'}</button>
              </div>
            </form>
          </div>
        )}

        {items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No nav items yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Label</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">href</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <NavItemRow key={item.id} item={item} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
