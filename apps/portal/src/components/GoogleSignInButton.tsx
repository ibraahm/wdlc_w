'use client';

import { useEffect, useRef, useState } from 'react';
import { googleLoginAction } from '@/lib/actions';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

declare global {
  interface Window {
    google?: any;
  }
}

// Renders the official Google Identity Services button. The button only appears
// when NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured, so password login is the
// default and nothing breaks when Google sign-in is not set up.
export default function GoogleSignInButton() {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function handleCredential(response: { credential?: string }) {
      if (!response?.credential) {
        setError('Google did not return a credential. Please try again.');
        return;
      }
      setBusy(true);
      setError('');
      // The server action verifies the token, sets cookies, and redirects on
      // success; it only returns here when there's an error.
      googleLoginAction(response.credential)
        .then((res) => {
          if (res?.error) setError(res.error);
        })
        .catch(() => setError('Google sign-in failed. Please try again.'))
        .finally(() => setBusy(false));
    }

    function init() {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
        ux_mode: 'popup',
        auto_select: false,
      });
      window.google.accounts.id.renderButton(ref.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: 320,
        logo_alignment: 'center',
      });
    }

    if (window.google) {
      init();
      return;
    }
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', init);
      return () => existing.removeEventListener('load', init);
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div ref={ref} aria-label="Sign in with Google" style={{ opacity: busy ? 0.5 : 1, pointerEvents: busy ? 'none' : 'auto' }} />
      </div>
      {busy && <p style={{ fontSize: '0.76rem', color: 'var(--muted)', textAlign: 'center', marginTop: '8px' }}>Signing in…</p>}
      {error && <div className="auth-error" style={{ marginTop: '12px' }}>{error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 4px' }}>
        <span style={{ flex: 1, height: '1px', background: 'var(--smoke)' }} />
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>or</span>
        <span style={{ flex: 1, height: '1px', background: 'var(--smoke)' }} />
      </div>
    </div>
  );
}
