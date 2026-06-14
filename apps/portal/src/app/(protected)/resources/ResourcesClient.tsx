'use client';

import { useState, useTransition } from 'react';
import { ackResourceAction } from '@/lib/actions';
import type { ResourceItem } from '@/lib/api';

export default function ResourcesClient({ resources }: { resources: ResourceItem[] }) {
  const [acked, setAcked] = useState<Set<string>>(() => new Set(resources.filter((r) => r.acknowledged).map((r) => r.id)));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function openAndAck(r: ResourceItem) {
    // Open the document, then record the acknowledgement.
    window.open(r.url, '_blank', 'noopener,noreferrer');
    if (acked.has(r.id)) return;
    setPendingId(r.id);
    startTransition(async () => {
      const res = await ackResourceAction(r.id);
      if (res.ok) setAcked((prev) => new Set(prev).add(r.id));
      setPendingId(null);
    });
  }

  const byCategory = new Map<string, ResourceItem[]>();
  for (const r of resources) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }

  return (
    <div className="portal-content">
      <div className="dash-eyebrow">Agent Portal</div>
      <h1 className="dash-title">Resources</h1>

      {resources.length === 0 ? (
        <div className="dash-card">
          <p className="dash-card-title">No resources assigned yet</p>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
            Reference documents and forms assigned to you or your branch will appear here.
          </p>
        </div>
      ) : (
        Array.from(byCategory.entries()).map(([category, list]) => (
          <div key={category} style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', margin: '12px 0 8px' }}>{category}</p>
            <div style={{ display: 'grid', gap: '12px' }}>
              {list.map((r) => (
                <div key={r.id} className="dash-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <p className="dash-card-title" style={{ marginBottom: '4px' }}>{r.title}</p>
                      {r.description && (
                        <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6 }}>{r.description}</p>
                      )}
                      {acked.has(r.id) && (
                        <p style={{ fontSize: '0.74rem', color: '#166534', marginTop: '6px', fontWeight: 600 }}>✓ Acknowledged</p>
                      )}
                    </div>
                    <button
                      onClick={() => openAndAck(r)}
                      disabled={pendingId === r.id}
                      className="auth-submit"
                      style={{ width: 'auto', padding: '10px 18px', flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      {pendingId === r.id ? 'Opening…' : acked.has(r.id) ? 'Open ↗' : 'Open & acknowledge ↗'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
