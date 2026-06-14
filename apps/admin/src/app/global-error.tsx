'use client';

import { useEffect } from 'react';

// Catches render/layout errors. The most common one in production is a stale
// JS chunk right after a deploy (the open tab references the previous build).
// We detect that and reload once to pull the new build, instead of showing a
// raw "Application error" to the user.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const msg = `${error?.name ?? ''} ${error?.message ?? ''}`.toLowerCase();
  const isChunkError =
    msg.includes('chunkloaderror') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('dynamically imported module') ||
    msg.includes('failed to fetch');

  useEffect(() => {
    if (!isChunkError) return;
    // Guard against reload loops: only auto-reload once per 30s.
    const KEY = 'wdlc_chunk_reload_at';
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 30_000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  }, [isChunkError]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', margin: 0, background: '#f6f7f9' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f2742', marginBottom: 8 }}>
            {isChunkError ? 'Updating to the latest version…' : 'Something went wrong'}
          </h1>
          <p style={{ fontSize: 14, color: '#556', lineHeight: 1.6, marginBottom: 20 }}>
            {isChunkError
              ? 'The app was just updated. Reloading to get the newest version.'
              : 'An unexpected error occurred. Please try again.'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => window.location.reload()} style={{ background: '#0f2742', color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontSize: 14, cursor: 'pointer' }}>
              Reload
            </button>
            <button onClick={() => reset()} style={{ background: '#fff', color: '#0f2742', border: '1px solid #ccd', borderRadius: 8, padding: '10px 18px', fontSize: 14, cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
