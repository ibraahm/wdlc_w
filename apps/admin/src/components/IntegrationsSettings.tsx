'use client';

import { useState, useTransition } from 'react';
import { saveSettingsAction } from '@/lib/actions';

// Runtime on/off switch for the DocuSign integration. The toggle lives here;
// the credentials stay in the server env. When off, the "Send for e-sign"
// action is hidden in agent applications and the API refuses to send.
export default function IntegrationsSettings({ docusignEnabled }: { docusignEnabled: boolean }) {
  const [enabled, setEnabled] = useState(docusignEnabled);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function toggle(next: boolean) {
    setError('');
    setSaved(false);
    setEnabled(next);
    start(async () => {
      const r = await saveSettingsAction([{ key: 'docusign.enabled', value: next }]);
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(r.error ?? 'Save failed');
        setEnabled(!next);
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 text-sm mb-1">Integrations</h2>
      <p className="text-xs text-gray-500 mb-4">Turn optional integrations on or off. Credentials are configured on the server (see System status).</p>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">DocuSign e-signature</p>
          <p className="text-xs text-gray-500">
            Enables the &ldquo;Send for e-sign&rdquo; button on agent applications.
            {saved && <span className="ml-2 font-semibold text-green-600">Saved</span>}
            {error && <span className="ml-2 font-semibold text-red-600">{error}</span>}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending}
          onClick={() => toggle(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-green-600' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
    </div>
  );
}
