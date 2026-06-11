'use client';

import { useState, useTransition } from 'react';
import type { Setting } from '@/lib/api';
import { saveSettingsAction, addSettingAction } from '@/lib/actions';

interface SettingRowProps {
  setting: Setting;
}

function SettingRow({ setting }: SettingRowProps) {
  const [value, setValue] = useState(setting.value);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError('');
    setSaved(false);
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
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="w-48 flex-shrink-0 pt-2">
        <span className="text-sm font-mono text-gray-700 font-medium">{setting.key}</span>
      </div>
      <div className="flex-1">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
      <div className="flex-shrink-0 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || value === setting.value}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
            saved
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-primary text-white hover:bg-blue-700 disabled:cursor-not-allowed'
          }`}
        >
          {isPending ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  );
}

interface SettingsManagerProps {
  initialSettings: Setting[];
}

export default function SettingsManager({ initialSettings }: SettingsManagerProps) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings);
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState('');
  const [isPending, startTransition] = useTransition();

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
        setSettings((prev) => {
          if (prev.find((s) => s.key === key)) {
            return prev.map((s) => (s.key === key ? { key, value } : s));
          }
          return [...prev, { key, value }];
        });
        setShowAdd(false);
        form.reset();
      } else {
        setAddError(result.error ?? 'Add failed');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Current settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">
          Current settings ({settings.length})
        </h2>

        {settings.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No settings configured.</p>
        ) : (
          <div>
            {settings.map((s) => (
              <SettingRow key={s.key} setting={s} />
            ))}
          </div>
        )}
      </div>

      {/* Add new setting */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm">Add new setting</h2>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-sm text-primary hover:underline"
            >
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
                {isPending ? 'Adding...' : 'Add setting'}
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
