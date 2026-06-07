'use client';

import { useState, useTransition } from 'react';
import type { NavItem } from '@/lib/api';
import { createNavItemAction, updateNavItemAction, deleteNavItemAction } from '@/lib/actions';

interface NavManagerProps {
  initialItems: NavItem[];
}

const LOCATIONS = ['header', 'footer', 'sidebar'];

function NavRow({
  item,
  onDelete,
}: {
  item: NavItem;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateNavItemAction(fd);
      if (result.ok) {
        setEditing(false);
        setError('');
      } else {
        setError(result.error ?? 'Update failed');
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete nav item "${item.label}"?`)) return;
    startTransition(async () => {
      const result = await deleteNavItemAction(item.id);
      if (result.ok) {
        onDelete(item.id);
      } else {
        setError(result.error ?? 'Delete failed');
      }
    });
  }

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={6} className="px-4 py-3">
          <form onSubmit={handleUpdate} className="space-y-3">
            <input type="hidden" name="id" value={item.id} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input
                name="label"
                defaultValue={item.label}
                required
                placeholder="Label"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <input
                name="href"
                defaultValue={item.href}
                required
                placeholder="href"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <select
                name="location"
                defaultValue={item.location}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              >
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                name="order"
                type="number"
                defaultValue={item.order}
                placeholder="Order"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="visible"
                  value="true"
                  defaultChecked={item.visible}
                />
                Visible
              </label>
              <input
                name="column"
                defaultValue={item.column ?? ''}
                placeholder="Column (optional)"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-60"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.label}</td>
      <td className="px-6 py-3 text-sm text-gray-500 font-mono">{item.href}</td>
      <td className="px-6 py-3 text-sm text-gray-500">{item.location}</td>
      <td className="px-6 py-3 text-sm text-gray-500 text-center">{item.order}</td>
      <td className="px-6 py-3 text-sm">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            item.visible
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {item.visible ? 'Visible' : 'Hidden'}
        </span>
      </td>
      <td className="px-6 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          {error && <span className="text-red-500 text-xs">{error}</span>}
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-primary hover:underline"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function NavManager({ initialItems }: NavManagerProps) {
  const [items, setItems] = useState<NavItem[]>(initialItems);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError('');
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await createNavItemAction(fd);
      if (result.ok) {
        setShowAddForm(false);
        form.reset();
        // Refresh — just reload to get server data
        window.location.reload();
      } else {
        setAddError(result.error ?? 'Create failed');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 text-sm">Nav items ({items.length})</h2>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add item'}
          </button>
        </div>

        {showAddForm && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input
                  name="label"
                  required
                  placeholder="Label *"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <input
                  name="href"
                  required
                  placeholder="href *"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <select
                  name="location"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <input
                  name="order"
                  type="number"
                  defaultValue={items.length}
                  placeholder="Order"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <input
                name="column"
                placeholder="Column (optional)"
                className="px-3 py-2 border border-gray-300 rounded text-sm w-48"
              />
              {addError && <p className="text-red-600 text-xs">{addError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-60"
                >
                  {isPending ? 'Adding...' : 'Add nav item'}
                </button>
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  href
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Location
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <NavRow key={item.id} item={item} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
