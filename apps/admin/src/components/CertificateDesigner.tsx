'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveCertificateAction, saveCourseCertAction, resetCourseCertAction } from '@/lib/actions';
import type { CertField, CertLayout } from '@/lib/api';

// LETTER landscape is 792 x 612 pt. The preview is drawn at a fixed width so
// font sizes (in pt for the PDF) scale 1:1 with the real output.
const PAGE_W = 792;
const PAGE_H = 612;
const PREVIEW_W = 720;
const FONT_SCALE = PREVIEW_W / PAGE_W;

const SAMPLE: Record<keyof CertLayout, string> = {
  name: 'Jordan A. Sample',
  course: 'Anti-Money-Laundering Essentials',
  details: 'Compliance  •  Score 95%  •  June 17, 2026',
  certId: 'Certificate ID: SAMPLE1234  •  Branch: USWDLC',
};

const FIELD_LABEL: Record<keyof CertLayout, string> = {
  name: 'Learner name',
  course: 'Course title',
  details: 'Details (category · score · date)',
  certId: 'Certificate ID / branch',
};

const FIELD_KEYS: (keyof CertLayout)[] = ['name', 'course', 'details', 'certId'];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const defaultX = (align: CertField['align']) => (align === 'left' ? 8 : align === 'right' ? 92 : 50);

export default function CertificateDesigner({
  initial,
  scope = 'global',
  courseId,
  hasOverride = false,
}: {
  initial: { templateImage: string | null; layout: CertLayout; brandLogo?: string | null; brandAddress?: string | null };
  scope?: 'global' | 'course';
  courseId?: string;
  hasOverride?: boolean;
}) {
  const router = useRouter();
  const [templateImage, setTemplateImage] = useState<string | null>(initial.templateImage);
  const [brandLogo, setBrandLogo] = useState<string | null>(initial.brandLogo ?? null);
  const [brandAddress, setBrandAddress] = useState<string>(initial.brandAddress ?? '');
  const [layout, setLayout] = useState<CertLayout>(initial.layout);
  const [selected, setSelected] = useState<keyof CertLayout>('name');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ key: keyof CertLayout; startX: number; startY: number; fieldX: number; fieldY: number } | null>(null);

  function setField<K extends keyof CertField>(key: keyof CertLayout, prop: K, value: CertField[K]) {
    setLayout((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
    setSaved(false);
  }
  function nudge(key: keyof CertLayout, dx: number, dy: number) {
    setLayout((prev) => {
      const f = prev[key];
      const x = clamp((f.xPct ?? defaultX(f.align)) + dx, 0, 100);
      const y = clamp(f.yPct + dy, 0, 100);
      return { ...prev, [key]: { ...f, xPct: Math.round(x * 10) / 10, yPct: Math.round(y * 10) / 10 } };
    });
    setSaved(false);
  }

  // ── Drag to position ────────────────────────────────────────────────────────
  function pointerPct(e: React.PointerEvent) {
    const rect = boxRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  }
  function onFieldDown(e: React.PointerEvent, k: keyof CertLayout) {
    e.preventDefault();
    setSelected(k);
    const p = pointerPct(e);
    const f = layout[k];
    dragRef.current = { key: k, startX: p.x, startY: p.y, fieldX: f.xPct ?? defaultX(f.align), fieldY: f.yPct };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onFieldMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const p = pointerPct(e);
    const nx = clamp(d.fieldX + (p.x - d.startX), 0, 100);
    const ny = clamp(d.fieldY + (p.y - d.startY), 0, 100);
    setLayout((prev) => ({ ...prev, [d.key]: { ...prev[d.key], xPct: Math.round(nx * 10) / 10, yPct: Math.round(ny * 10) / 10 } }));
    setSaved(false);
  }
  function onFieldUp() { dragRef.current = null; }

  function readImage(file: File, max: number, onOk: (dataUrl: string) => void) {
    setError('');
    if (!/^image\/(png|jpe?g)$/.test(file.type)) { setError('Please choose a PNG or JPEG image.'); return; }
    if (file.size > max) { setError('Image is too large (max ~3 MB).'); return; }
    const reader = new FileReader();
    reader.onload = () => { onOk(reader.result as string); setSaved(false); };
    reader.readAsDataURL(file);
  }

  function save() {
    setError('');
    startTransition(async () => {
      const res = scope === 'course' && courseId
        ? await saveCourseCertAction(courseId, { templateImage, layout })
        : await saveCertificateAction({ templateImage, layout, brandLogo, brandAddress: brandAddress.trim() || null });
      if (res.ok) { setSaved(true); if (scope === 'course') router.refresh(); }
      else setError(res.error ?? 'Save failed');
    });
  }
  function resetToDefault() {
    if (!courseId) return;
    setError('');
    startTransition(async () => {
      const res = await resetCourseCertAction(courseId);
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Reset failed');
    });
  }
  async function preview() {
    setError('');
    const res = await fetch('/api/training/certificate-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateImage, layout, brandLogo, brandAddress: brandAddress.trim() || null }),
    });
    if (!res.ok) { setError('Could not generate preview.'); return; }
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
  }

  const sel = layout[selected];
  const alignBtn = (a: CertField['align'], labelText: string) => (
    <button
      type="button"
      onClick={() => setField(selected, 'align', a)}
      className={`px-3 py-1.5 text-sm font-medium border ${sel.align === a ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} ${a === 'left' ? 'rounded-l-md' : a === 'right' ? 'rounded-r-md' : ''}`}
    >
      {labelText}
    </button>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[auto,1fr] gap-6">
      {/* ── Live, draggable preview ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="overflow-x-auto">
          <div
            ref={boxRef}
            className="relative border border-gray-300 rounded-lg overflow-hidden bg-gray-50 shadow-sm"
            style={{ width: PREVIEW_W, height: (PREVIEW_W * PAGE_H) / PAGE_W }}
          >
            {templateImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={templateImage} alt="Certificate template" style={{ width: '100%', height: '100%', objectFit: 'fill' }} draggable={false} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-gray-400 px-8">
                Upload a certificate background below, then drag the fields where you want them.
                <br />Without a background, the built-in World Direct Link design is used.
              </div>
            )}

            {templateImage && FIELD_KEYS.map((k) => {
              const f = layout[k];
              if (!f.show) return null;
              const anchorX = f.xPct ?? defaultX(f.align);
              const tx = f.align === 'left' ? '0' : f.align === 'right' ? '-100%' : '-50%';
              const isSel = selected === k;
              return (
                <div
                  key={k}
                  onPointerDown={(e) => onFieldDown(e, k)}
                  onPointerMove={onFieldMove}
                  onPointerUp={onFieldUp}
                  title="Drag to move"
                  style={{
                    position: 'absolute',
                    left: `${anchorX}%`,
                    top: `${f.yPct}%`,
                    transform: `translate(${tx}, 0)`,
                    fontSize: `${f.fontSize * FONT_SCALE}px`,
                    color: f.color,
                    fontWeight: f.bold ? 700 : 400,
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    padding: '2px 5px',
                    cursor: 'grab',
                    userSelect: 'none',
                    touchAction: 'none',
                    borderRadius: 3,
                    outline: isSel ? '2px solid #2563eb' : '1px dashed rgba(0,0,0,0.3)',
                    background: isSel ? 'rgba(37,99,235,0.08)' : 'transparent',
                  }}
                >
                  {SAMPLE[k]}
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-gray-500">Sample data shown. {templateImage ? 'Drag any field to move it; click a field to edit its style on the right.' : ''} Positions match the generated PDF.</p>
      </div>

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {error && <div role="alert" className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
        {saved && <div role="status" className="rounded bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">Saved.</div>}
        {scope === 'course' && (
          <div className={`rounded px-3 py-2 text-sm border ${hasOverride ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            {hasOverride
              ? 'This course uses a custom certificate that overrides the global default.'
              : 'This course uses the global default. Saving here creates a course-specific certificate; the editor is pre-filled with the current default.'}
          </div>
        )}

        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 space-y-2">
          <label htmlFor="cert-template" className="block text-xs font-medium text-gray-700">Certificate background (PNG or JPEG, landscape)</label>
          <input id="cert-template" type="file" accept="image/png,image/jpeg" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) readImage(fl, 3_000_000, setTemplateImage); }} className="text-sm" />
          {templateImage && (
            <button type="button" onClick={() => { setTemplateImage(null); setSaved(false); }} className="text-xs text-red-700 hover:underline">Remove background</button>
          )}
        </div>

        {/* Field editor */}
        {templateImage ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Fields — click to select, drag on the preview to move</p>
              <div className="flex flex-wrap gap-2">
                {FIELD_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSelected(k)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border ${selected === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} ${!layout[k].show ? 'opacity-50 line-through' : ''}`}
                  >
                    {FIELD_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{FIELD_LABEL[selected]}</span>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={sel.show} onChange={(e) => setField(selected, 'show', e.target.checked)} />
                  Show on certificate
                </label>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="f-size" className="text-sm text-gray-600 w-16">Size</label>
                <input id="f-size" type="range" min={8} max={60} value={sel.fontSize} onChange={(e) => setField(selected, 'fontSize', Number(e.target.value))} className="flex-1" />
                <span className="text-sm text-gray-700 w-10 text-right">{sel.fontSize}pt</span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Style</span>
                  <button type="button" onClick={() => setField(selected, 'bold', !sel.bold)} className={`px-3 py-1.5 text-sm font-bold border rounded-md ${sel.bold ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'}`}>B</button>
                  <input aria-label="Text color" type="color" value={sel.color} onChange={(e) => setField(selected, 'color', e.target.value)} className="h-8 w-10 rounded border border-gray-300" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Align</span>
                  <div className="inline-flex">{alignBtn('left', 'Left')}{alignBtn('center', 'Center')}{alignBtn('right', 'Right')}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Nudge</span>
                <div className="inline-grid grid-cols-3 gap-1">
                  <span />
                  <button type="button" aria-label="Move up" onClick={() => nudge(selected, 0, -1)} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">↑</button>
                  <span />
                  <button type="button" aria-label="Move left" onClick={() => nudge(selected, -1, 0)} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">←</button>
                  <button type="button" aria-label="Center horizontally" title="Center horizontally" onClick={() => { setField(selected, 'align', 'center'); setField(selected, 'xPct', 50); }} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">⊕</button>
                  <button type="button" aria-label="Move right" onClick={() => nudge(selected, 1, 0)} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">→</button>
                  <span />
                  <button type="button" aria-label="Move down" onClick={() => nudge(selected, 0, 1)} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">↓</button>
                  <span />
                </div>
                <span className="text-xs text-gray-400">x {Math.round(sel.xPct ?? defaultX(sel.align))}% · y {Math.round(sel.yPct)}%</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-4">
            Field placement applies to an uploaded background. Upload one above to drag the learner name, course, details and certificate ID into place. With no background, the built-in design is used automatically.
          </p>
        )}

        {scope === 'global' && (
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 space-y-2">
            <label htmlFor="cert-logo" className="block text-xs font-medium text-gray-700">Company logo (built-in certificate, DD file PDF & application PDF)</label>
            <div className="flex items-center gap-3">
              {brandLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brandLogo} alt="Company logo" style={{ height: 40, maxWidth: 160, objectFit: 'contain' }} className="rounded border border-gray-200 bg-white p-1" />
              )}
              <input id="cert-logo" type="file" accept="image/png,image/jpeg" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) readImage(fl, 3_000_000, setBrandLogo); }} className="text-sm" />
            </div>
            {brandLogo && (
              <button type="button" onClick={() => { setBrandLogo(null); setSaved(false); }} className="text-xs text-red-700 hover:underline">Remove logo</button>
            )}
          </div>
        )}

        {scope === 'global' && (
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 space-y-1">
            <label htmlFor="cert-address" className="block text-xs font-medium text-gray-700">Company address (shown on the certificate and document footers)</label>
            <input
              id="cert-address"
              type="text"
              value={brandAddress}
              maxLength={200}
              onChange={(e) => { setBrandAddress(e.target.value); setSaved(false); }}
              placeholder="e.g. 1234 Brickell Ave, Suite 200, Miami, FL 33131"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={isPending} className="rounded-md bg-gray-900 text-white text-sm px-4 py-2 disabled:opacity-50">
            {isPending ? 'Saving…' : scope === 'course' ? 'Save course certificate' : 'Save layout'}
          </button>
          <button onClick={preview} className="rounded-md bg-white border border-gray-300 text-gray-800 text-sm px-4 py-2">Preview sample PDF</button>
          {scope === 'course' && hasOverride && (
            <button onClick={resetToDefault} disabled={isPending} className="rounded-md bg-white border border-red-300 text-red-700 text-sm px-4 py-2 disabled:opacity-50">Reset to default</button>
          )}
        </div>
      </div>
    </div>
  );
}
