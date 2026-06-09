'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { BuilderForm, FormField } from '@/lib/api';
import { saveFormAction } from '@/lib/actions';

const FIELD_TYPES: { type: string; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'email', label: 'Email', icon: '@' },
  { type: 'tel', label: 'Phone', icon: '☎' },
  { type: 'number', label: 'Number', icon: '#' },
  { type: 'textarea', label: 'Long text', icon: '¶' },
  { type: 'select', label: 'Dropdown', icon: '▾' },
  { type: 'radio', label: 'Radio', icon: '◉' },
  { type: 'checkbox', label: 'Checkboxes', icon: '☑' },
  { type: 'yesno', label: 'Yes / No', icon: '⊻' },
  { type: 'heading', label: 'Section heading', icon: '§' },
];

const HAS_OPTIONS = new Set(['select', 'radio', 'checkbox']);

function uid(): string {
  return 'f_' + Math.random().toString(36).slice(2, 9);
}

function nameFromLabel(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || uid();
}

const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

export default function FormBuilder({ form }: { form: BuilderForm }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<'build' | 'settings'>('build');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(form.name);
  const [slug, setSlug] = useState(form.slug);
  const [description, setDescription] = useState(form.description ?? '');
  const [status, setStatus] = useState(form.status);
  const [submitLabel, setSubmitLabel] = useState(form.submitLabel);
  const [successMessage, setSuccessMessage] = useState(form.successMessage);
  const [recaptcha, setRecaptcha] = useState(form.recaptcha);
  const [fields, setFields] = useState<FormField[]>(form.fields ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(form.fields?.[0]?.id ?? null);

  const dragIndex = useRef<number | null>(null);

  const selected = fields.find((f) => f.id === selectedId) ?? null;

  function addField(type: string) {
    const f: FormField = {
      id: uid(),
      type,
      name: '',
      label: type === 'heading' ? 'Section heading' : 'Untitled field',
      required: false,
      width: 'full',
      ...(HAS_OPTIONS.has(type) ? { options: ['Option 1', 'Option 2'] } : {}),
    };
    f.name = nameFromLabel(f.label) + '_' + f.id.slice(-4);
    setFields((prev) => [...prev, f]);
    setSelectedId(f.id);
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function onDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function save() {
    if (!name.trim()) { setError('Form name is required.'); setTab('settings'); return; }
    if (!slug.trim()) { setError('Slug is required.'); setTab('settings'); return; }
    // Ensure every non-heading field has a machine name.
    const cleaned = fields.map((f) => ({
      ...f,
      name: f.name?.trim() || nameFromLabel(f.label) + '_' + f.id.slice(-4),
    }));
    setError('');
    startTransition(async () => {
      const res = await saveFormAction(form.id, {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        status,
        submitLabel,
        successMessage,
        recaptcha,
        fields: cleaned,
      });
      if (!res.ok) { setError(res.error ?? 'Save failed'); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {saved && <span className="text-sm text-green-600 ml-auto">Saved ✓</span>}
        <button
          onClick={save}
          disabled={isPending}
          className="ml-auto rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save form'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([['build', 'Builder'], ['settings', 'Settings']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${tab === id ? 'border-navy text-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* BUILDER */}
      {tab === 'build' && (
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_300px] gap-5">
          {/* Palette */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Add field</h3>
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft.type}
                onClick={() => addField(ft.type)}
                className="w-full flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-navy hover:text-navy text-left"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs">{ft.icon}</span>
                {ft.label}
              </button>
            ))}
          </div>

          {/* Canvas */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Form fields <span className="font-normal normal-case">— drag to reorder</span>
            </h3>
            {fields.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
                No fields yet. Add fields from the left.
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={() => { dragIndex.current = i; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(i)}
                    onClick={() => setSelectedId(f.id)}
                    className={`flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 cursor-pointer ${selectedId === f.id ? 'border-navy ring-1 ring-navy/30' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <span className="cursor-grab text-gray-300 select-none">⠿</span>
                    <div className="flex-1 min-w-0">
                      <div className={`truncate text-sm ${f.type === 'heading' ? 'font-bold text-gray-900' : 'text-gray-800'}`}>
                        {f.label || '(untitled)'}{f.required && f.type !== 'heading' && <span className="text-red-500"> *</span>}
                      </div>
                      <div className="text-[11px] text-gray-400">{f.type}{f.type !== 'heading' && ` · ${f.name}`}{f.width === 'half' && ' · half-width'}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeField(f.id); }}
                      className="text-gray-300 hover:text-red-500 text-sm"
                      aria-label="Remove field"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Properties */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Properties</h3>
            {!selected ? (
              <p className="text-sm text-gray-400">Select a field to edit its properties.</p>
            ) : (
              <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                <div>
                  <label className={labelCls}>Label</label>
                  <input value={selected.label} onChange={(e) => updateField(selected.id, { label: e.target.value })} className={inputCls} />
                </div>
                {selected.type !== 'heading' && (
                  <>
                    <div>
                      <label className={labelCls}>Field name (data key)</label>
                      <input value={selected.name} onChange={(e) => updateField(selected.id, { name: nameFromLabel(e.target.value) })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Placeholder</label>
                      <input value={selected.placeholder ?? ''} onChange={(e) => updateField(selected.id, { placeholder: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Help text</label>
                      <input value={selected.helpText ?? ''} onChange={(e) => updateField(selected.id, { helpText: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Width</label>
                      <select value={selected.width ?? 'full'} onChange={(e) => updateField(selected.id, { width: e.target.value as 'full' | 'half' })} className={inputCls}>
                        <option value="full">Full width</option>
                        <option value="half">Half width</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={!!selected.required} onChange={(e) => updateField(selected.id, { required: e.target.checked })} />
                      Required
                    </label>
                  </>
                )}
                {HAS_OPTIONS.has(selected.type) && (
                  <div>
                    <label className={labelCls}>Options (one per line)</label>
                    <textarea
                      value={(selected.options ?? []).join('\n')}
                      onChange={(e) => updateField(selected.id, { options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                      rows={5}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {tab === 'settings' && (
        <div className="max-w-2xl space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Form name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description (internal)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="DRAFT">Draft (hidden)</option>
                <option value="PUBLISHED">Published (live)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Submit button label</label>
              <input value={submitLabel} onChange={(e) => setSubmitLabel(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Success message</label>
            <textarea value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} rows={2} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={recaptcha} onChange={(e) => setRecaptcha(e.target.checked)} />
            Protect with reCAPTCHA
          </label>
        </div>
      )}

      {/* SUBMISSIONS */}
    </div>
  );
}
