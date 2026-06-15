'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRequestAction } from '@/lib/actions';
import type { AgentRequest } from '@/lib/api';

const TYPES = [
  { value: 'RISK_ASSESSMENT', label: 'Risk assessment' },
  { value: 'LOCATION_DD', label: 'Location due diligence' },
  { value: 'CHECKLIST', label: 'Checklist review' },
  { value: 'PHOTOS', label: 'Photos upload' },
  { value: 'OTHER', label: 'Other' },
];
const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));
const STATUS_COLOR: Record<string, string> = {
  OPEN: '#92400e', IN_REVIEW: '#1d4ed8', NEEDS_INFO: '#b45309', APPROVED: '#166534', REJECTED: '#b91c1c', CLOSED: 'var(--muted)',
};

function fmt(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

export default function RequestsClient({ requests }: { requests: AgentRequest[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState('RISK_ASSESSMENT');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [links, setLinks] = useState<{ name: string; url: string }[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  function addLink() {
    const u = linkUrl.trim();
    if (!u) return;
    setLinks((l) => [...l, { name: u.split('/').pop() || u, url: u }]);
    setLinkUrl('');
  }

  function submit() {
    if (!subject.trim()) { setError('Please add a subject.'); return; }
    setError('');
    start(async () => {
      const res = await createRequestAction({ type, subject, details, attachments: links });
      if (res.error) setError(res.error);
      else { setCreating(false); setSubject(''); setDetails(''); setLinks([]); router.refresh(); if (res.id) router.push(`/requests/${res.id}`); }
    });
  }

  return (
    <div className="portal-content">
      <div className="dash-eyebrow">Agent Portal</div>
      <h1 className="dash-title">Requests to your Regional Office</h1>

      {!creating && (
        <div style={{ marginBottom: '16px' }}>
          <button onClick={() => setCreating(true)} className="auth-submit" style={{ width: 'auto', padding: '12px 24px' }}>+ New request</button>
        </div>
      )}

      {creating && (
        <div className="dash-card">
          <p className="dash-card-title">New request</p>
          {error && <div className="auth-error" style={{ marginBottom: '14px' }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="auth-field">
              <label className="auth-label">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="auth-input">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="auth-field">
              <label className="auth-label">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="auth-input" placeholder="Brief summary" />
            </div>
            <div className="auth-field">
              <label className="auth-label">Details</label>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} className="auth-input" rows={5} placeholder="Describe what you need…" />
            </div>
            <div className="auth-field">
              <label className="auth-label">Attachment links (photos / documents)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="auth-input" placeholder="https://… (Dropbox, Drive, photo URL)" />
                <button type="button" onClick={addLink} className="portal-logout-btn" style={{ padding: '0 16px', whiteSpace: 'nowrap' }}>Add</button>
              </div>
              {links.length > 0 && (
                <ul style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {links.map((l, i) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '3px 0' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.url}</span>
                      <button onClick={() => setLinks((arr) => arr.filter((_, j) => j !== i))} style={{ color: '#b91c1c', background: 'none', border: 0, cursor: 'pointer' }}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px' }}>Paste links to photos or files. (Direct uploads coming soon.)</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={submit} disabled={pending} className="auth-submit" style={{ width: 'auto', padding: '12px 24px' }}>{pending ? 'Submitting…' : 'Submit request'}</button>
              <button onClick={() => setCreating(false)} className="portal-logout-btn" style={{ padding: '12px 18px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {requests.length === 0 && !creating ? (
        <div className="dash-card">
          <p className="dash-card-title">No requests yet</p>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
            Submit a request to your regional office for a risk assessment, location due diligence, checklist review, or to send photos.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {requests.map((r) => (
            <a key={r.id} href={`/requests/${r.id}`} className="dash-card" style={{ display: 'block', textDecoration: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-card-title" style={{ margin: 0, padding: 0, border: 0, textTransform: 'none', letterSpacing: 0, fontSize: '0.95rem', color: 'var(--charcoal)' }}>{r.subject}</p>
                  <p style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: '4px' }}>{TYPE_LABEL[r.type] ?? r.type} · {fmt(r.createdAt)}{r.attachments.length ? ` · ${r.attachments.length} attachment(s)` : ''}</p>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: STATUS_COLOR[r.status] ?? 'var(--muted)', whiteSpace: 'nowrap' }}>{r.status.replace('_', ' ')}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
