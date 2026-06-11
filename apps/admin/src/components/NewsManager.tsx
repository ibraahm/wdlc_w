'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { NewsPost, NewsPostInput } from '@/lib/api';
import { createNewsPostAction, updateNewsPostAction, deleteNewsPostAction } from '@/lib/actions';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const EMPTY: NewsPostInput = {
  title: '',
  slug: '',
  category: 'NEWS',
  summary: '',
  body: '',
  author: '',
  status: 'DRAFT',
  publishedAt: null,
};

function PostForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: NewsPostInput;
  submitLabel: string;
  busy: boolean;
  onSubmit: (data: NewsPostInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<NewsPostInput>(initial);

  function set<K extends keyof NewsPostInput>(key: K, value: NewsPostInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: f.slug && f.slug !== slugify(f.title || '') ? f.slug : slugify(title),
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
          <input
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Post title"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Slug *</label>
          <input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="url-friendly-slug"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="NEWS">News</option>
            <option value="PRESS">Press Release</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Author</label>
          <input
            value={form.author || ''}
            onChange={(e) => set('author', e.target.value)}
            placeholder="Author name"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Publish Date</label>
          <input
            type="date"
            value={form.publishedAt ? form.publishedAt.slice(0, 10) : ''}
            onChange={(e) => set('publishedAt', e.target.value ? e.target.value : null)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Summary (shown in listing)</label>
        <input
          value={form.summary || ''}
          onChange={(e) => set('summary', e.target.value)}
          placeholder="One-paragraph summary for the listing page"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Body (HTML or plain text)</label>
        <textarea
          value={form.body || ''}
          onChange={(e) => set('body', e.target.value)}
          placeholder="Full article content…"
          rows={10}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Image URL (optional)</label>
        <input
          value={form.imageUrl || ''}
          onChange={(e) => set('imageUrl', e.target.value)}
          placeholder="https://…"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function NewsManager({ posts }: { posts: NewsPost[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function handleCreate(data: NewsPostInput) {
    setError('');
    startTransition(async () => {
      const res = await createNewsPostAction(data);
      if (res.ok) { setCreating(false); router.refresh(); }
      else setError(res.error ?? 'Create failed');
    });
  }

  function handleUpdate(id: string, data: NewsPostInput) {
    setError('');
    startTransition(async () => {
      const res = await updateNewsPostAction(id, data);
      if (res.ok) { setEditingId(null); router.refresh(); }
      else setError(res.error ?? 'Update failed');
    });
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setError('');
    startTransition(async () => {
      const res = await deleteNewsPostAction(id);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Delete failed');
    });
  }

  const CATEGORY_LABEL: Record<string, string> = { NEWS: 'News', PRESS: 'Press Release' };
  const STATUS_STYLES: Record<string, string> = {
    PUBLISHED: 'bg-green-100 text-green-700',
    DRAFT: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!creating && (
        <div className="flex justify-end">
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Post
          </button>
        </div>
      )}

      {creating && (
        <PostForm
          initial={EMPTY}
          submitLabel="Create Post"
          busy={isPending}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {posts.length === 0 && !creating ? (
        <div className="border border-dashed border-gray-300 rounded-lg py-12 text-center text-gray-400 text-sm">
          No posts yet. Click "New Post" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) =>
            editingId === post.id ? (
              <PostForm
                key={post.id}
                initial={{
                  title: post.title,
                  slug: post.slug,
                  category: post.category,
                  summary: post.summary,
                  body: post.body,
                  author: post.author,
                  imageUrl: post.imageUrl,
                  status: post.status,
                  publishedAt: post.publishedAt ?? null,
                }}
                submitLabel="Save Changes"
                busy={isPending}
                onSubmit={(data) => handleUpdate(post.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div key={post.id} className="flex items-start gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">{post.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[post.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {post.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                      {CATEGORY_LABEL[post.category] ?? post.category}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 space-x-2">
                    <span>/{post.slug}</span>
                    {post.author && <span>· {post.author}</span>}
                    {post.publishedAt && <span>· {new Date(post.publishedAt).toLocaleDateString()}</span>}
                  </div>
                  {post.summary && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{post.summary}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setEditingId(post.id)}
                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    disabled={isPending}
                    className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
