'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveCertificateAction, saveCourseCertAction, resetCourseCertAction } from '@/lib/actions';
import type { CertField, CertLayout } from '@/lib/api';

// LETTER landscape is 792 x 612 pt. The preview is rendered at a fixed width so
// field font sizes (specified in pt for the PDF) scale 1:1 with the real output.
const PAGE_W = 792;
const PAGE_H = 612;
const PREVIEW_W = 760;
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

export default function CertificateDesigner({
  initial,
  scope = 'global',
  courseId,
  hasOverride = false,
}: {
  initial: { templateImage: string | null; layout: CertLayout };
  scope?: 'global' | 'course';
  courseId?: string;
  hasOverride?: boolean;
}) {
  const router = useRouter();
  const [templateImage, setTemplateImage] = useState<string | null>(initial.templateImage);
  const [layout, setLayout] = useState<CertLayout>(initial.layout);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof CertField>(key: keyof CertLayout, prop: K, value: CertField[K]) {
    setLayout((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
    setSaved(false);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) { setError('Template must be a PNG or JPEG image.'); return; }
    if (file.size > 3_000_000) { setError('Image is too large (max ~3 MB).'); return; }
    const reader = new FileReader();
    reader.onload = () => { setTemplateImage(reader.result as string); setSaved(false); };
    reader.readAsDataURL(file);
  }

  function save() {
    setError('');
    startTransition(async () => {
      const res = scope === 'course' && courseId
        ? await saveCourseCertAction(courseId, { templateImage, layout })
        : await saveCertificateAction({ templateImage, layout });
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
      body: JSON.stringify({ templateImage, layout }),
    });
    if (!res.ok) { setError('Could not generate preview.'); return; }
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
  }

  const inputCls = 'rounded border border-gray-300 px-2 py-1 text-sm';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto,1fr] gap-6">
      {/* Live preview */}
      <div className="space-y-3">
        <div
          className="relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
          style={{ width: PREVIEW_W, height: PREVIEW_W * PAGE_H / PAGE_W, maxWidth: '100%' }}
        >
          {templateImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={templateImage} alt="Certificate template" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 text-center px-6">
              No template uploaded — the built-in World Direct Link design will be used.
            </div>
          )}
          {templateImage && FIELD_KEYS.map((k) => {
            const f = layout[k];
            if (!f.show) return null;
            const base: React.CSSProperties = {
              position: 'absolute',
              top: `${f.yPct}%`,
              fontSize: `${f.fontSize * FONT_SCALE}px`,
              color: f.color,
              fontWeight: f.bold ? 700 : 400,
              fontFamily: 'Helvetica, Arial, sans-serif',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            };
            const pos: React.CSSProperties =
              f.align === 'center' ? { left: 0, width: '100%', textAlign: 'center' }
                : f.align === 'right' ? { right: `${100 - (f.xPct ?? 92)}%`, textAlign: 'right' }
                  : { left: `${f.xPct ?? 8}%`, textAlign: 'left' };
            return <div key={k} style={{ ...base, ...pos }}>{SAMPLE[k]}</div>;
          })}
        </div>
        <p className="text-xs text-gray-500">Preview uses sample data. Positions and sizes match the generated PDF.</p>
      </div>

      {/* Controls */}
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
          <label htmlFor="cert-template" className="block text-xs font-medium text-gray-700">Template image (PNG or JPEG, landscape)</label>
          <input id="cert-template" type="file" accept="image/png,image/jpeg" onChange={onFile} className="text-sm" />
          {templateImage && (
            <button type="button" onClick={() => { setTemplateImage(null); setSaved(false); }} className="text-xs text-red-700 hover:underline">Remove template</button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th scope="col" className="p-2 font-medium">Field</th>
                <th scope="col" className="p-2 font-medium">Show</th>
                <th scope="col" className="p-2 font-medium">Y %</th>
                <th scope="col" className="p-2 font-medium">X %</th>
                <th scope="col" className="p-2 font-medium">Size</th>
                <th scope="col" className="p-2 font-medium">Align</th>
                <th scope="col" className="p-2 font-medium">Bold</th>
                <th scope="col" className="p-2 font-medium">Color</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_KEYS.map((k) => {
                const f = layout[k];
                return (
                  <tr key={k} className="border-b border-gray-50">
                    <td className="p-2 text-gray-700">{FIELD_LABEL[k]}</td>
                    <td className="p-2"><input aria-label={`Show ${FIELD_LABEL[k]}`} type="checkbox" checked={f.show} onChange={(e) => setField(k, 'show', e.target.checked)} /></td>
                    <td className="p-2"><input aria-label={`${FIELD_LABEL[k]} vertical position`} type="number" min={0} max={100} value={f.yPct} onChange={(e) => setField(k, 'yPct', Number(e.target.value))} className={`${inputCls} w-16`} /></td>
                    <td className="p-2"><input aria-label={`${FIELD_LABEL[k]} horizontal position`} type="number" min={0} max={100} value={f.xPct ?? (f.align === 'right' ? 92 : 8)} disabled={f.align === 'center'} title={f.align === 'center' ? 'Centered fields span the full width' : undefined} onChange={(e) => setField(k, 'xPct', Number(e.target.value))} className={`${inputCls} w-16 disabled:bg-gray-100 disabled:text-gray-400`} /></td>
                    <td className="p-2"><input aria-label={`${FIELD_LABEL[k]} font size`} type="number" min={6} max={72} value={f.fontSize} onChange={(e) => setField(k, 'fontSize', Number(e.target.value))} className={`${inputCls} w-16`} /></td>
                    <td className="p-2">
                      <select aria-label={`${FIELD_LABEL[k]} alignment`} value={f.align} onChange={(e) => setField(k, 'align', e.target.value as CertField['align'])} className={inputCls}>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </td>
                    <td className="p-2"><input aria-label={`${FIELD_LABEL[k]} bold`} type="checkbox" checked={!!f.bold} onChange={(e) => setField(k, 'bold', e.target.checked)} /></td>
                    <td className="p-2"><input aria-label={`${FIELD_LABEL[k]} color`} type="color" value={f.color} onChange={(e) => setField(k, 'color', e.target.value)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">Y % is the vertical position from the top. Centered fields span the full width (X % disabled); left/right-aligned fields anchor to X %.</p>

        <div className="flex gap-2">
          <button onClick={save} disabled={isPending} className="rounded-md bg-gray-900 text-white text-sm px-4 py-2 disabled:opacity-50">
            {isPending ? 'Saving…' : scope === 'course' ? 'Save course certificate' : 'Save certificate'}
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
