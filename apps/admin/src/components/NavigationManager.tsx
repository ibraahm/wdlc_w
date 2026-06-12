'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { NavItem } from '@/lib/api';
import {
  createNavItemAction,
  updateNavItemAction,
  deleteNavItemAction,
} from '@/lib/actions';

type Loc = 'HEADER' | 'UTILITY' | 'FOOTER';

const TABS: { id: Loc; label: string; blurb: string }[] = [
  { id: 'HEADER', label: 'Header menu', blurb: 'The main navigation bar. Top-level items may have dropdown sub-items.' },
  { id: 'UTILITY', label: 'Utility bar', blurb: 'The small links above the main menu (Licenses, Contact, etc.).' },
  { id: 'FOOTER', label: 'Footer', blurb: 'Footer link columns. Group items by giving them the same Column name.' },
];

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary';

function ItemEditor({
  item,
  showColumn,
  onChanged,
  indent = false,
}: {
  item: NavItem;
  showColumn: boolean;
  onChanged: () => void;
  indent?: boolean;
}) {
  const [label, setLabel] = useState(item.label);
  const [href, setHref] = useState(item.href);
  const [column, setColumn] = useState(item.column ?? '');
  const [order, setOrder] = useState(item.order);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const dirty =
    label !== item.label ||
    href !== item.href ||
    order !== item.order ||
    (showColumn && (column ?? '') !== (item.column ?? ''));

  function save() {
    setError('');
    start(async () => {
      const res = await updateNavItemAction(item.id, {
        label,
        href,
        order: Number(order) || 0,
        ...(showColumn ? { column: column.trim() || null } : {}),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
        onChanged();
      } else setError(res.error ?? 'Save failed');
    });
  }

  function toggleVisible() {
    start(async () => {
      const res = await updateNavItemAction(item.id, { visible: !item.visible });
      if (res.ok) onChanged();
      else setError(res.error ?? 'Update failed');
    });
  }

  function remove() {
    if (!confirm(`Delete "${item.label}"${item.children?.length ? ' and its sub-items' : ''}?`)) return;
    start(async () => {
      const res = await deleteNavItemAction(item.id);
      if (res.ok) onChanged();
      else setError(res.error ?? 'Delete failed');
    });
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-3 ${indent ? 'ml-6' : ''} ${!item.visible ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
        <div className="sm:col-span-4">
          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Label</label>
          <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className={showColumn ? 'sm:col-span-3' : 'sm:col-span-5'}>
          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Link (href)</label>
          <input className={inputCls} value={href} onChange={(e) => setHref(e.target.value)} placeholder="/about" />
        </div>
        {showColumn && (
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Column</label>
            <input className={inputCls} value={column} onChange={(e) => setColumn(e.target.value)} placeholder="Services" />
          </div>
        )}
        <div className="sm:col-span-1">
          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Order</label>
          <input
            type="number"
            className={inputCls}
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end gap-1 sm:col-span-2">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className={`px-3 py-2 text-xs font-medium rounded-lg disabled:opacity-50 ${
              saved ? 'bg-green-100 text-green-700' : 'bg-primary text-white hover:bg-blue-700'
            }`}
          >
            {pending ? '…' : saved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={toggleVisible}
            disabled={pending}
            title={item.visible ? 'Hide from site' : 'Show on site'}
            className="px-2 py-2 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            {item.visible ? 'Visible' : 'Hidden'}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="px-2 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function AddItemForm({
  location,
  parentId,
  showColumn,
  onAdded,
  compact,
}: {
  location: Loc;
  parentId?: string;
  showColumn: boolean;
  onAdded: () => void;
  compact?: boolean;
}) {
  const [label, setLabel] = useState('');
  const [href, setHref] = useState('');
  const [column, setColumn] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!label.trim() || !href.trim()) {
      setError('Label and link are required.');
      return;
    }
    setError('');
    start(async () => {
      const res = await createNavItemAction({
        label: label.trim(),
        href: href.trim(),
        location,
        parentId: parentId ?? null,
        ...(showColumn ? { column: column.trim() || null } : {}),
      });
      if (res.ok) {
        setLabel('');
        setHref('');
        setColumn('');
        onAdded();
      } else setError(res.error ?? 'Add failed');
    });
  }

  return (
    <form onSubmit={submit} className={`flex flex-wrap items-end gap-2 ${compact ? 'ml-6' : ''}`}>
      <div className="flex-1 min-w-[140px]">
        {!compact && <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Label</label>}
        <input className={inputCls} placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="flex-1 min-w-[140px]">
        {!compact && <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Link (href)</label>}
        <input className={inputCls} placeholder="/path" value={href} onChange={(e) => setHref(e.target.value)} />
      </div>
      {showColumn && (
        <div className="w-32">
          {!compact && <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Column</label>}
          <input className={inputCls} placeholder="Column" value={column} onChange={(e) => setColumn(e.target.value)} />
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Adding…' : compact ? '+ Sub-item' : '+ Add item'}
      </button>
      {error && <p className="w-full text-red-500 text-xs">{error}</p>}
    </form>
  );
}

export default function NavigationManager({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Loc>('HEADER');
  const refresh = () => router.refresh();

  const current = TABS.find((t) => t.id === tab)!;
  const forLoc = items.filter((i) => i.location === tab).sort((a, b) => a.order - b.order);
  const showColumn = tab === 'FOOTER';
  const allowChildren = tab === 'HEADER';

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-gray-400">({items.filter((i) => i.location === t.id).length})</span>
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500">{current.blurb}</p>

      {/* Items */}
      <div className="space-y-3">
        {forLoc.length === 0 && (
          <p className="text-sm text-gray-400 italic">No items yet — add one below.</p>
        )}
        {forLoc.map((item) => (
          <div key={item.id} className="space-y-2">
            <ItemEditor item={item} showColumn={showColumn} onChanged={refresh} />
            {allowChildren && (
              <>
                {item.children?.map((child) => (
                  <ItemEditor key={child.id} item={child} showColumn={false} onChanged={refresh} indent />
                ))}
                <AddItemForm location={tab} parentId={item.id} showColumn={false} onAdded={refresh} compact />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add top-level */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Add a new {tab === 'HEADER' ? 'top-level menu item' : tab === 'FOOTER' ? 'footer link' : 'utility link'}
        </h3>
        <AddItemForm location={tab} showColumn={showColumn} onAdded={refresh} />
      </div>

      <p className="text-xs text-gray-400">
        Changes appear on the public site within ~60 seconds (page cache). Lower “Order” numbers show first.
      </p>
    </div>
  );
}
