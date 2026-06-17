'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestMessageAction } from '@/lib/actions';
import type { AgentRequest } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#92400e', IN_REVIEW: '#1d4ed8', NEEDS_INFO: '#b45309', APPROVED: '#166534', REJECTED: '#b91c1c', CLOSED: 'var(--muted)',
};
function when(d: string) { return new Date(d).toLocaleString(); }

export default function RequestDetailClient({ request }: { request: AgentRequest }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const messages = request.messages ?? [];

  function send() {
    if (!body.trim()) return;
    setError('');
    start(async () => {
      const res = await requestMessageAction(request.id, body);
      if (res.error) setError(res.error);
      else { setBody(''); router.refresh(); }
    });
  }

  return (
    <div className="portal-content">
      <div className="dash-eyebrow"><a href="/requests" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Requests</a></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h1 className="dash-title" style={{ marginBottom: '6px' }}>{request.subject}</h1>
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: STATUS_COLOR[request.status] ?? 'var(--muted)' }}>{request.status.replace('_', ' ')}</span>
      </div>

      <div className="dash-card">
        {request.details && <p style={{ fontSize: '0.9rem', color: 'var(--charcoal)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{request.details}</p>}
        {request.attachments.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: '6px' }}>Attachments</p>
            <ul style={{ fontSize: '0.84rem' }}>
              {request.attachments.map((a, i) => (
                <li key={i}><a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>{a.name || a.url} ↗</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="dash-card">
        <p className="dash-card-title">Conversation</p>
        {messages.length === 0 ? (
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>No messages yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m) => (
              <div key={m.id} style={{ padding: '10px 12px', borderRadius: '8px', background: m.authorType === 'office' ? 'rgba(200,150,12,0.08)' : 'var(--smoke)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '3px' }}>
                  {m.authorType === 'office' ? 'Regional office' : 'You'}{m.authorName ? ` · ${m.authorName}` : ''} · {when(m.createdAt)}
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--charcoal)', whiteSpace: 'pre-wrap' }}>{m.body}</div>
              </div>
            ))}
          </div>
        )}
        {error && <div className="auth-error" style={{ margin: '12px 0' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <input value={body} onChange={(e) => setBody(e.target.value)} className="auth-input" aria-label="Write a message" placeholder="Write a message…" onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
          <button onClick={send} disabled={pending} aria-busy={pending} aria-label={pending ? 'Sending message' : 'Send message'} className="auth-submit" style={{ width: 'auto', padding: '0 20px' }}>{pending ? '…' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}
