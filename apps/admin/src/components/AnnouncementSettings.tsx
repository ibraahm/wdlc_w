'use client';

import { useState, useTransition } from 'react';
import { saveSettingsAction } from '@/lib/actions';

export type AnnouncementConfig = {
  enabled: boolean;
  placement: 'bar' | 'popup' | 'both';
  variant: 'info' | 'warning' | 'alert';
  title: string;
  message: string;
  imageUrl: string;
  link: string;
  linkLabel: string;
};

const DEFAULTS: AnnouncementConfig = {
  enabled: false,
  placement: 'bar',
  variant: 'info',
  title: '',
  message: '',
  imageUrl: '',
  link: '',
  linkLabel: '',
};

const MAX_IMAGE_BYTES = 1_500_000; // ~1.5 MB - kept small since it's stored inline

export default function AnnouncementSettings({ initial }: { initial: Partial<AnnouncementConfig> | null }) {
  const [cfg, setCfg] = useState<AnnouncementConfig>({ ...DEFAULTS, ...(initial ?? {}) });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof AnnouncementConfig>(key: K, value: AnnouncementConfig[K]) {
    setCfg((c) => ({ ...c, [key]: value }));
    setSaved(false);
  }

  function onImageFile(file: File) {
    setError('');
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large (max ~1.5 MB). Use a smaller image or paste a hosted URL instead.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set('imageUrl', reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setError('');
    setSaved(false);
    startTransition(async () => {
      // Send the object itself; the backend serializes it once. (Pre-stringifying
      // here would double-encode it and the public site would read back a string.)
      const result = await saveSettingsAction([{ key: 'announcement', value: cfg }]);
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(result.error ?? 'Save failed');
      }
    });
  }

  const accent =
    cfg.variant === 'warning' ? '#c8960c' : cfg.variant === 'alert' ? '#8f1d1d' : '#152d50';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Announcement banner</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Shown on the public website on every visit — e.g. &ldquo;We&rsquo;ve temporarily paused sending to&hellip;&rdquo;.
            Choose a top bar, a centered popup, or both, with an optional image.
          </p>
        </div>
        <label className="flex flex-shrink-0 items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary"
          />
          {cfg.enabled ? 'Live' : 'Off'}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Show as</span>
          <select
            value={cfg.placement}
            onChange={(e) => set('placement', e.target.value as AnnouncementConfig['placement'])}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="bar">Top bar</option>
            <option value="popup">Popup</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Style</span>
          <select
            value={cfg.variant}
            onChange={(e) => set('variant', e.target.value as AnnouncementConfig['variant'])}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="info">Info (navy)</option>
            <option value="warning">Warning (gold)</option>
            <option value="alert">Alert (red)</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-700">Title (optional)</span>
        <input
          value={cfg.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Service update"
          maxLength={120}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-700">Message *</span>
        <textarea
          value={cfg.message}
          onChange={(e) => set('message', e.target.value)}
          rows={3}
          placeholder="We have temporarily paused sending to [country] until further notice. We apologize for the inconvenience."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Link URL (optional)</span>
          <input
            value={cfg.link}
            onChange={(e) => set('link', e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Link label (optional)</span>
          <input
            value={cfg.linkLabel}
            onChange={(e) => set('linkLabel', e.target.value)}
            placeholder="Learn more"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-medium text-gray-700">Image (optional)</span>
        <div className="flex flex-wrap items-center gap-3">
          {cfg.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.imageUrl} alt="" className="h-12 w-12 rounded object-cover border border-gray-200" />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageFile(f); }}
            className="text-sm"
          />
          {cfg.imageUrl && (
            <button type="button" onClick={() => set('imageUrl', '')} className="text-xs text-red-700 hover:underline">
              Remove
            </button>
          )}
        </div>
        <input
          value={cfg.imageUrl.startsWith('data:') ? '' : cfg.imageUrl}
          onChange={(e) => set('imageUrl', e.target.value)}
          placeholder="…or paste a hosted image URL (https://…)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Live preview */}
      <div>
        <span className="mb-1 block text-xs font-medium text-gray-700">Preview</span>
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-white" style={{ background: accent }}>
            {cfg.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cfg.imageUrl} alt="" className="h-5 w-5 rounded object-cover" />
            )}
            <span className={cfg.variant === 'warning' ? 'text-[#20160a]' : ''}>
              {cfg.title && <strong>{cfg.title} </strong>}
              {cfg.message || 'Your announcement message will appear here.'}
              {cfg.link && <span className="underline ml-2">{cfg.linkLabel || 'Learn more'}</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
            saved ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-primary text-white hover:bg-blue-700'
          }`}
        >
          {isPending ? 'Saving…' : saved ? 'Saved!' : 'Save announcement'}
        </button>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        {!cfg.message && cfg.enabled && <p className="text-amber-600 text-xs">Add a message before it will show.</p>}
      </div>
    </div>
  );
}
