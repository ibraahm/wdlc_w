'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Page } from '@/lib/api';
import type { PuckData } from './puck/config';
import { createPageAction, updatePageAction } from '@/lib/actions';

// Load Puck editor only client-side (it uses browser APIs)
const PuckEditor = dynamic(() => import('./PuckEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '80vh', border: '1px solid #e8e4dc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
      Loading editor…
    </div>
  ),
});

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

// Map legacy block type aliases to Puck component names
const LEGACY_TYPE_MAP: Record<string, string> = {
  hero: 'Hero',
  richtext: 'RichText',
  text: 'RichText',
  callout: 'Callout',
  facttable: 'FactTable',
  table: 'FactTable',
  featuregrid: 'FeatureGrid',
  features: 'FeatureGrid',
  ctaband: 'CtaBand',
  cta: 'CtaBand',
  spacer: 'Spacer',
};

function normaliseType(type: string): string {
  const key = type.replace(/[\s_-]/g, '').toLowerCase();
  return LEGACY_TYPE_MAP[key] ?? type;
}

function parsePuckData(raw: unknown): PuckData | null {
  if (!raw) return null;
  try {
    // The API may hand us blocks already deserialized (an array/object) or as a
    // JSON string. Normalise to a value either way.
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    // Puck format has a `content` array and `root` key. Puck requires every
    // content item to carry a unique `props.id` or it won't render the block —
    // seeded/imported data often lacks ids, so backfill them here.
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.content)) {
      return {
        ...parsed,
        content: parsed.content.map((c: { type: string; props?: Record<string, unknown> }, i: number) => {
          const props = { ...(c.props ?? {}) };
          if (!props.id) props.id = `${c.type}-${i}`;
          return { type: c.type, props };
        }),
        root: parsed.root ?? { props: {} },
        zones: parsed.zones ?? {},
      } as PuckData;
    }
    // Legacy blocks array format: [{ type, data }] — convert to Puck content
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return null;
      return {
        content: parsed.map((b: { type: string; data?: Record<string, unknown>; props?: Record<string, unknown> }, i: number) => {
          const type = normaliseType(b.type);
          const props = { ...(b.data ?? b.props ?? {}) };
          if (!props.id) props.id = `${type}-${i}`;
          return { type, props };
        }),
        root: { props: {} },
        zones: {},
      } as PuckData;
    }
    return null;
  } catch {
    return null;
  }
}

interface PageFormProps {
  page?: Page;
  mode: 'create' | 'edit';
}

export default function PageForm({ page, mode }: PageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [title, setTitle] = useState(page?.title ?? '');
  const [slug, setSlug] = useState(page?.slug ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!page?.slug);
  const [puckData, setPuckData] = useState<PuckData | null>(() => parsePuckData(page?.blocks));
  const puckDataRef = useRef<PuckData | null>(puckData);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManuallyEdited) setSlug(slugify(value));
  }

  function handlePuckChange(data: PuckData) {
    setPuckData(data);
    puckDataRef.current = data;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    // The backend stores blocks as a [{ type, data }] array. Convert the Puck
    // editor's { content: [{ type, props }] } shape into that format on save.
    const content = puckDataRef.current?.content ?? [];
    const blocks = content.map((c) => {
      const { id: _id, ...data } = (c.props ?? {}) as Record<string, unknown>;
      return { type: c.type, data };
    });
    fd.set('blocks', JSON.stringify(blocks));

    startTransition(async () => {
      const result = mode === 'create' ? await createPageAction(fd) : await updatePageAction(fd);
      if (result.error) {
        setError(result.error);
      } else if (result.page) {
        router.push(`/pages/${result.page.slug}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode === 'edit' && <input type="hidden" name="slug" value={page?.slug} />}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Core fields */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">Page details</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            name="title"
            required
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="Page title"
          />
        </div>

        {mode === 'create' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <div className="flex items-center">
              <span className="text-sm text-gray-400 mr-1">/</span>
              <input
                name="slug"
                required
                value={slug}
                onChange={(e) => { setSlugManuallyEdited(true); setSlug(e.target.value); }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy font-mono"
                placeholder="page-slug"
                pattern="[a-z0-9/\-]+"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Auto-generated from title. Lowercase, hyphens only.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            rows={2}
            defaultValue={page?.description ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="Short description (optional)"
          />
        </div>
      </div>

      {/* Puck visual editor */}
      <div className="space-y-2">
        <h2 className="font-semibold text-gray-900 text-sm">Page content</h2>
        <p className="text-xs text-gray-400">Drag blocks from the left panel onto the canvas. Click any block to edit its fields in the right panel.</p>
        <PuckEditor initialData={puckData} onChange={handlePuckChange} />
      </div>

      {/* SEO */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">SEO</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
          <input
            name="seoTitle"
            defaultValue={page?.seoTitle ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="Override meta title (optional)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
          <textarea
            name="seoDescription"
            rows={2}
            defaultValue={page?.seoDescription ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            placeholder="Override meta description (optional)"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-navy text-white font-medium rounded-lg text-sm hover:bg-navy-mid disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Saving…' : mode === 'create' ? 'Save as draft' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
