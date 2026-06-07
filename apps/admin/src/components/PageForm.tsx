'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import BlockEditor from './BlockEditor';
import type { Page, Block } from '@/lib/api';
import { createPageAction, updatePageAction } from '@/lib/actions';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

interface PageFormProps {
  page?: Page;
  mode: 'create' | 'edit';
}

export default function PageForm({ page, mode }: PageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>('');
  const [title, setTitle] = useState(page?.title ?? '');
  const [slug, setSlug] = useState(page?.slug ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!page?.slug);

  // Parse initial blocks
  let initialBlocks: Block[] = [];
  if (page?.blocks) {
    try {
      initialBlocks = JSON.parse(page.blocks);
    } catch {
      // ignore
    }
  }

  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    // Override blocks from state (since hidden input might not have latest)
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
      {/* Hidden slug for edit mode */}
      {mode === 'edit' && <input type="hidden" name="slug" value={page?.slug} />}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                onChange={(e) => handleSlugChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                placeholder="page-slug"
                pattern="[a-z0-9-]+"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Short description (optional)"
          />
        </div>
      </div>

      {/* Blocks */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">Page blocks</h2>
        <BlockEditor
          initialBlocks={initialBlocks}
          onChange={setBlocks}
          name="blocks"
        />
      </div>

      {/* SEO */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">SEO</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
          <input
            name="seoTitle"
            defaultValue={page?.seoTitle ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Override meta title (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
          <textarea
            name="seoDescription"
            rows={2}
            defaultValue={page?.seoDescription ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Override meta description (optional)"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending
            ? 'Saving...'
            : mode === 'create'
              ? 'Save as draft'
              : 'Save changes'}
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
