'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { BuilderForm } from '@/lib/api';
import { createFormAction, deleteFormAction } from '@/lib/actions';

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function FormsManager({ forms }: { forms: BuilderForm[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  function create() {
    if (!name.trim()) { setError('Please enter a form name.'); return; }
    const finalSlug = slug.trim() || slugify(name);
    setError('');
    startTransition(async () => {
      const res = await createFormAction({ name: name.trim(), slug: finalSlug, fields: [] });
      if (!res.ok) { setError(res.error ?? 'Create failed'); return; }
      router.push(`/forms/${res.id}`);
    });
  }

  function remove(id: string, label: string) {
    if (!confirm(`Delete the form "${label}" and all its submissions?`)) return;
    setError('');
    startTransition(async () => {
      const res = await deleteFormAction(id);
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
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {showNew ? 'Cancel' : '+ New form'}
        </button>
      </div>

      {showNew && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Form name</label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
                placeholder="e.g. Contact Us"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="contact-us"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>
          <button
            onClick={create}
            disabled={isPending}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Create &amp; open builder
          </button>
        </div>
      )}

      {forms.length === 0 ? (
        <p className="text-sm text-gray-500">No forms yet. Create your first form to get started.</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Form</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Fields</th>
                <th className="px-4 py-3 font-medium">Submissions</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/forms/${f.id}`} className="font-medium text-navy hover:underline">{f.name}</Link>
                    {f.description && <div className="text-gray-400 text-xs">{f.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500"><code>{f.slug}</code></td>
                  <td className="px-4 py-3 text-gray-700">{f.fields?.length ?? 0}</td>
                  <td className="px-4 py-3 text-gray-700">{f.submissionCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${f.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/forms/${f.id}`} className="text-xs text-navy hover:underline">Edit</Link>
                      <button onClick={() => remove(f.id, f.name)} disabled={isPending} className="text-xs text-red-500 hover:text-red-700">Delete</button>
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
