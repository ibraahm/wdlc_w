'use client';

import { useEffect, useState } from 'react';
import { ackResourceAction } from '@/lib/actions';
import type { ResourceItem } from '@/lib/api';

// Turn common share links into something a browser can show inline.
// (For external hosts this is best-effort — some block embedding entirely, which
// is why we always offer an "open in a new tab" fallback below the viewer.)
function embedUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
    // Dropbox: serve the raw file (renders PDFs/images inline) instead of the
    // preview page, which refuses to be embedded.
    if (host.includes('dropbox.com')) {
      u.searchParams.delete('dl');
      u.searchParams.set('raw', '1');
      return u.toString();
    }
    // Google Drive: use the embeddable /preview form.
    if (host.includes('drive.google.com')) {
      return url.replace('/view', '/preview').replace('/edit', '/preview');
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
      <div>
        <a href="/resources" style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>← Back to Resources</a>
        <h1 className="dash-title" style={{ margin: '6px 0 0' }}>{resource.title}</h1>
        {resource.description && <p style={{ fontSize: '0.92rem', color: 'var(--charcoal)', marginTop: '4px', lineHeight: 1.6 }}>{resource.description}</p>}
        {acked && <p style={{ fontSize: '0.85rem', color: '#166534', marginTop: '6px', fontWeight: 700 }}>✓ You have viewed this document</p>}
      </div>

      <div className="dash-card" style={{ padding: 0, overflow: 'hidden', height: '75vh', minHeight: '420px' }}>
        <iframe
          src={src}
          title={resource.title}
          style={{ width: '100%', height: '100%', border: 0 }}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Always-available fallback: some document hosts block in-page viewing. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--charcoal)', margin: 0 }}>
          Can&apos;t see the document above?
        </p>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', padding: '10px 20px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, background: 'var(--gold)', color: '#fff', textDecoration: 'none' }}
        >
          Open in a new tab ↗
        </a>
        {resource.allowDownload && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            style={{ display: 'inline-block', padding: '10px 20px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, background: '#fff', color: 'var(--charcoal)', border: '2px solid var(--smoke)', textDecoration: 'none' }}
          >
            ⬇ Download
          </a>
        )}
      </div>
    </div>
  );
}
