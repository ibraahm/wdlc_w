'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { RiskAssessment, RiskFactor } from '@/lib/api';
import { loadRiskAssessmentsAction, createRiskAssessmentAction } from '@/lib/actions';

// Mirrors backend RISK_FACTORS.
const FACTORS: { key: string; label: string }[] = [
  { key: 'geography', label: 'Geographic risk (states / corridors served)' },
  { key: 'businessType', label: 'Business type' },
  { key: 'volume', label: 'Transaction volume' },
  { key: 'customerBase', label: 'Customer base' },
  { key: 'products', label: 'Products & services' },
  { key: 'ownership', label: 'Ownership / PEP exposure' },
  { key: 'history', label: 'Compliance history / adverse media' },
];
const RATING_COLOR: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700', MEDIUM: 'bg-amber-100 text-amber-700', HIGH: 'bg-red-100 text-red-700',
};
function fmt(d: string) { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }

export default function RiskAssessmentPanel({ ddFileId, canAssess }: { ddFileId: string; canAssess: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<RiskAssessment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const reload = useCallback(() => {
    loadRiskAssessmentsAction(ddFileId).then((res) => {
      if (res.rows) setRows(res.rows);
      setLoaded(true);
    });
  }, [ddFileId]);
  useEffect(() => { reload(); }, [reload]);

  function submit() {
    const factors: RiskFactor[] = FACTORS.filter((f) => ratings[f.key]).map((f) => ({ key: f.key, label: f.label, rating: ratings[f.key] }));
    if (factors.length === 0) { setError('Rate at least one factor.'); return; }
    setError('');
    start(async () => {
      const res = await createRiskAssessmentAction(ddFileId, factors, notes);
      if (res.ok) { setForm(false); setRatings({}); setNotes(''); reload(); router.refresh(); }
      else setError(res.error ?? 'Save failed');
    });
  }

  const latest = rows[0];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Risk assessment</h3>
        {latest && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${RATING_COLOR[latest.rating] ?? 'bg-gray-100'}`}>{latest.rating} · {latest.score}</span>}
      </div>

      {!loaded ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          {latest && (
            <p className="text-xs text-gray-500 mb-3">Last assessed {fmt(latest.createdAt)}{latest.assessedBy ? ` by ${latest.assessedBy}` : ''}.</p>
          )}

          {canAssess && !form && (
            <button onClick={() => setForm(true)} className="px-3 py-1.5 text-xs font-semibold bg-navy text-white rounded hover:bg-navy/90">
              {latest ? 'New assessment' : 'Start assessment'}
            </button>
          )}

          {form && (
            <div className="space-y-3">
              {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>}
              {FACTORS.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700">{f.label}</span>
                  <div className="flex gap-1 shrink-0">
                    {[{ v: 1, l: 'Low' }, { v: 2, l: 'Med' }, { v: 3, l: 'High' }].map((o) => (
                      <button key={o.v} type="button" onClick={() => setRatings((r) => ({ ...r, [f.key]: o.v }))}
                        className={`px-2.5 py-1 text-xs rounded border ${ratings[f.key] === o.v ? (o.v === 1 ? 'bg-green-600 text-white border-green-600' : o.v === 2 ? 'bg-amber-500 text-white border-amber-500' : 'bg-red-600 text-white border-red-600') : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button onClick={submit} disabled={pending} className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{pending ? 'Saving…' : 'Save & set rating'}</button>
                <button onClick={() => setForm(false)} className="px-4 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          {rows.length > 0 && !form && (
            <div className="mt-3 border-t border-gray-100 pt-3 space-y-1.5 max-h-48 overflow-auto">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{fmt(r.createdAt)}{r.assessedBy ? ` · ${r.assessedBy}` : ''}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${RATING_COLOR[r.rating] ?? 'bg-gray-100'}`}>{r.rating} · {r.score}</span>
                </div>
              ))}
            </div>
          )}

          {!latest && !form && !canAssess && <p className="text-sm text-gray-400">No assessment recorded yet.</p>}
        </>
      )}
    </div>
  );
}
