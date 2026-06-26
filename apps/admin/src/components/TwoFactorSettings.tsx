'use client';

import { useState, useTransition } from 'react';
import QRCode from 'qrcode';
import { setupMfaAction, enableMfaAction, disableMfaAction } from '@/lib/actions';

export default function TwoFactorSettings({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [stage, setStage] = useState<'idle' | 'setup' | 'disable'>('idle');
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  function beginSetup() {
    setError('');
    start(async () => {
      const res = await setupMfaAction();
      if (!res.ok || !res.otpauthUrl) { setError(res.error ?? 'Setup failed'); return; }
      setSecret(res.secret ?? '');
      try {
        setQr(await QRCode.toDataURL(res.otpauthUrl, { margin: 1, width: 200 }));
      } catch {
        setQr('');
      }
      setCode('');
      setStage('setup');
    });
  }

  function confirmEnable() {
    setError('');
    start(async () => {
      const res = await enableMfaAction(code.trim());
      if (res.ok) { setEnabled(true); setStage('idle'); setSecret(''); setQr(''); setCode(''); }
      else setError(res.error ?? 'Could not enable 2FA');
    });
  }

  function confirmDisable() {
    setError('');
    start(async () => {
      const res = await disableMfaAction(code.trim());
      if (res.ok) { setEnabled(false); setStage('idle'); setCode(''); }
      else setError(res.error ?? 'Could not disable 2FA');
    });
  }

  const codeInput = (
    <input
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      placeholder="6-digit code"
      className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
    />
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Two-factor authentication</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Protect your admin account with an authenticator app (Google Authenticator, Authy, 1Password…).
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {enabled ? 'Enabled' : 'Off'}
        </span>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {stage === 'idle' && (
        <div className="mt-4">
          {enabled ? (
            <button onClick={() => { setStage('disable'); setCode(''); setError(''); }} className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
              Turn off two-factor
            </button>
          ) : (
            <button onClick={beginSetup} disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {pending ? 'Preparing…' : 'Set up two-factor'}
            </button>
          )}
        </div>
      )}

      {stage === 'setup' && (
        <div className="mt-4 space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
            <li>Scan this QR code with your authenticator app.</li>
            <li>Enter the 6-digit code it shows to confirm.</li>
          </ol>
          <div className="flex flex-wrap items-start gap-4">
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Authenticator QR code" className="rounded-lg border border-gray-200" width={180} height={180} />
            )}
            <div className="text-xs text-gray-500">
              <p className="mb-1">Can&rsquo;t scan? Enter this key manually:</p>
              <code className="break-all rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-800">{secret}</code>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {codeInput}
            <button onClick={confirmEnable} disabled={pending || code.length !== 6} className="rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50">
              {pending ? 'Verifying…' : 'Verify & enable'}
            </button>
            <button onClick={() => { setStage('idle'); setError(''); }} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === 'disable' && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-700">Enter a current authenticator code to turn off two-factor.</p>
          <div className="flex flex-wrap items-center gap-2">
            {codeInput}
            <button onClick={confirmDisable} disabled={pending || code.length !== 6} className="rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
              {pending ? 'Turning off…' : 'Turn off'}
            </button>
            <button onClick={() => { setStage('idle'); setError(''); }} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
