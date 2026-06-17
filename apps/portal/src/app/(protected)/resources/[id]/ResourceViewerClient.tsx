'use client';

import { useEffect, useState } from 'react';
import { ackResourceAction } from '@/lib/actions';
import type { ResourceItem } from '@/lib/api';

// Best-effort transform of common share links into something that renders
// inline in an <iframe>. (For external hosts this is a deterrent, not a hard
// download block — the host's own UI may still allow saving.)
function embedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('dropbox.com')) {
      u.searchParams.delete('dl');
      u.searchParams.set('raw', '1');
      return u.toString();
    }
    if (u.hostname.includes('drive.google.com')) {
      return url.replace('/view', '/preview');
    }
    return url;
  } catch {
    return url;
  }
}

export default function ResourceViewerClient({ resource }: { resource: ResourceItem }) {
  const [acked, setAcked] = useState(resource.acknowledged);

  // Viewing the document records the acknowledgement.
  useEffect(() => {
    if (resource.acknowledged) return;
    let cancelled = false;
    ackResourceAction(resource.id).then((r) => {
      if (!cancelled && r.ok) setAcked(true);
    });
    return () => { cancelled = true; };
  }, [resource.id, resource.acknowledged]);

  const src = embedUrl(resource.url);

  return (
    <div className="portal-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <a href="/resources" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>← Resources</a>
          <h1 className="dash-title" style={{ margin: '4px 0 0' }}>{resource.title}</h1>
          {resource.description && <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginTop: '4px' }}>{resource.description}</p>}
          {acked && <p style={{ fontSize: '0.74rem', color: '#166534', marginTop: '6px', fontWeight: 600 }}>✓ Acknowledged</p>}
        </div>
        {resource.allowDownload && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="auth-submit"
            style={{ width: 'auto', padding: '10px 18px', flexShrink: 0, whiteSpace: 'nowrap', textDecoration: 'none' }}
          >
            ⬇ Download / open ↗
          </a>
        )}
      </div>

      <div className="dash-card" style={{ padding: 0, overflow: 'hidden', height: '78vh' }}>
        <iframe
          src={src}
          title={resource.title}
          style={{ width: '100%', height: '100%', border: 0 }}
          // Sandbox without allow-downloads when downloads aren't permitted.
          sandbox={resource.allowDownload ? 'allow-scripts allow-same-origin allow-popups allow-downloads' : 'allow-scripts allow-same-origin'}
        />
      </div>

      {!resource.allowDownload && (
        <p style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
          This document is view-only. Contact World Direct Link if you need a downloadable copy.
        </p>
      )}
    </div>
  );
}
