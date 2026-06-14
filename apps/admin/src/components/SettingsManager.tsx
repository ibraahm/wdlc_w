'use client';

import { useState, useTransition } from 'react';
import type { Setting } from '@/lib/api';
import { saveSettingsAction, addSettingAction } from '@/lib/actions';

// Friendly metadata for known setting keys. Unknown keys still render with a
// raw editor, so nothing is hidden - this only adds labels and help text.
const KNOWN: Record<string, { label: string; description: string }> = {
  siteName: { label: 'Site name', description: 'Brand name shown across the site.' },
  legalName: { label: 'Legal company name', description: 'Full registered entity name (used in footer / legal text).' },
  tagline: { label: 'Tagline', description: 'Short slogan shown under the brand name in the footer.' },
  nmlsId: { label: 'NMLS ID', description: 'Your NMLS registration number.' },
  description: { label: 'Site description', description: 'Default SEO / meta description for the public site.' },
  contactEmail: { label: 'Contact email', description: 'Public-facing contact email address.' },
  contactPhone: { label: 'Contact phone', description: 'Public-facing phone number.' },
  footerText: { label: 'Footer text', description: 'Free-text line shown in the footer.' },
  maintenanceMode: { label: 'Maintenance mode', description: 'Set to true to show a maintenance notice.' },
  'application.draftTimeoutMinutes': {
    label: 'Application draft timeout (minutes)',
    description: 'How long an in-progress agent application is kept before it expires.',
  },
};

// If the stored value is a JSON string ("foo"), edit it as plain text and
// re-encode on save; otherwise (numbers, booleans, objects) edit raw.
function decode(raw: string): { text: string; wasJsonString: boolean } {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return { text: parsed, wasJsonString: true };
  } catch {
    /* not JSON - edit raw */
  }
  return { text: raw, wasJsonString: false };
}

function SettingRow({ setting }: { setting: Setting }) {
  const meta = KNOWN[setting.key];
  const initial = decode(setting.value);
  const [text, setText] = useState(initial.text);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const longField = initial.text.length > 60 || setting.key === 'description' || setting.key === 'footerText';

  function handleSave() {
    setError('');
    setSaved(false);
    const value = initial.wasJsonString ? JSON.stringify(text) : text;
    startTransition(async () => {
      const result = await saveSettingsAction([{ key: setting.key, value }]);
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error ?? 'Save failed');
      }
    });
  }

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{meta?.label ?? setting.key}</p>
          {meta && <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>}
          <code className="text-[11px] text-gray-400">{setting.key}</code>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || text === initial.text}
          className={`flex-shrink-0 px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
            saved
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-primary text-white hover:bg-blue-700 disabled:cursor-not-allowed'
          }`}
        >
          {isPending ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>
      <div className="mt-2">
        {longField ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        ) : (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    </div>
  );
}

export default function SettingsManager({ initialSettings }: { initialSettings: Setting[] }) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings);
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Known settings first (in catalog order), then everything else alphabetically.
  const knownOrder = Object.keys(KNOWN);
  const sorted = [...settings].sort((a, b) => {
    const ia = knownOrder.indexOf(a.key);
    const ib = knownOrder.indexOf(b.key);
    if (ia === -1 && ib === -1) return a.key.localeCompare(b.key);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError('');
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await addSettingAction(fd);
      if (result.ok) {
        const key = fd.get('key') as string;
        const value = fd.get('value') as string;
        setSettings((prev) =>
          prev.find((s) => s.key === key)
            ? prev.map((s) => (s.key === key ? { key, value } : s))
            : [...prev, { key, value }],
        );
        setShowAdd(false);
        form.reset();
      } else {
        setAddError(result.error ?? 'Add failed');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-1">Site settings</h2>
        <p className="text-xs text-gray-500 mb-4">
          {settings.length} setting{settings.length === 1 ? '' : 's'}. Edits take effect on the public site shortly after saving.
        </p>

        {settings.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No settings configured.</p>
        ) : (
          <div>
            {sorted.map((s) => (
              <SettingRow key={s.key} setting={s} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Add a setting</h2>
            <p className="text-xs text-gray-500 mt-0.5">Advanced - for keys the app reads by name.</p>
          </div>
          {!showAdd && (
            <button onClick={() => setShowAdd(true)} className="text-sm text-primary hover:underline">
              + Add
            </button>
          )}
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Key *</label>
              <input
                name="key"
                required
                placeholder="setting_key"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value *</label>
              <textarea
                name="value"
                required
                rows={2}
                placeholder="Setting value"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {addError && <p className="text-red-500 text-xs">{addError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {isPending ? 'Adding…' : 'Add setting'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
