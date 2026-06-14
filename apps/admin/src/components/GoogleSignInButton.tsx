'use client';

import { useEffect, useRef, useState } from 'react';
import { googleLoginAction } from '@/lib/actions';

const CLIENT_ID = process.env.NEXT_PUBLIC_ADMIN_GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

declare global {
  interface Window {
    google?: any;
  }
}

// Google sign-in for the admin console. Renders only when a client id is set.
export default function GoogleSignInButton() {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function handleCredential(response: { credential?: string }) {
      if (!response?.credential) { setError('Google did not return a credential.'); return; }
      setBusy(true);
      setError('');
      googleLoginAction(response.credential)
        .then((res) => { if (res?.error) setError(res.error); })
        .catch(() => setError('Google sign-in failed.'))
        .finally(() => setBusy(false));
    }

    function init() {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredential, ux_mode: 'popup' });
      window.google.accounts.id.renderButton(ref.current, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', width: 320 });
    }

    if (window.google) { init(); return; }
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`) as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', init); return () => existing.removeEventListener('load', init); }
    const s = document.createElement('script');
    s.src = GSI_SRC; s.async = true; s.defer = true; s.onload = init;
    document.head.appendChild(s);
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className="mb-5">
      <div className="flex justify-center">
        <div ref={ref} aria-label="Sign in with Google" style={{ opacity: busy ? 0.5 : 1, pointerEvents: busy ? 'none' : 'auto' }} />
      </div>
      {busy && <p className="mt-2 text-center text-xs text-gray-500">Signing in…</p>}
      {error && <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-xs uppercase tracking-wide text-gray-400">or</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
    </div>
  );
}
