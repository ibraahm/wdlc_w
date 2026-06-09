'use client';

import { useState, type FormEvent } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import type { CmsForm, CmsFormField } from '@/lib/cms';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const inputCls =
  'w-full rounded-lg border border-[#d9e0e8] bg-white px-3 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';

// Renders any CMS-built form dynamically from its field definitions.
export default function FormRenderer({ form }: { form: CmsForm }) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  function setValue(name: string, v: unknown) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function validate(): string {
    for (const f of form.fields) {
      if (f.type === 'heading' || !f.required) continue;
      const v = values[f.name];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        return `Please complete: ${f.label}`;
      }
    }
    if (!consent) return 'Please acknowledge the privacy and electronic-communications consent to continue.';
    return '';
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setPending(true);

    let recaptchaToken: string | undefined;
    if (form.recaptcha && executeRecaptcha) {
      try {
        recaptchaToken = await executeRecaptcha('form_submit');
      } catch {
        setError('Security check failed. Please try again.');
        setPending(false);
        return;
      }
    }

    try {
      const res = await fetch(`${API}/cms/forms/${form.slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Record the consent acknowledgement alongside the submission as evidence.
        body: JSON.stringify({
          data: { ...values, _consentAcknowledged: true, _consentAt: new Date().toISOString() },
          recaptchaToken,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || 'Submission failed');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-6 text-green-800">
        <p className="font-medium">{form.successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {form.fields.map((f) => (
          <FieldControl
            key={f.id}
            field={f}
            value={values[f.name]}
            onChange={(v) => setValue(f.name, v)}
          />
        ))}
      </div>

      <label className="flex items-start gap-2 text-sm text-ink/80">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          I have read the{' '}
          <a href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</a>{' '}
          and consent to the{' '}
          <a href="/legal/electronic-communications" target="_blank" className="text-primary underline">
            Electronic Communications
          </a>{' '}
          terms. I consent to World Direct Link processing the information I provide to respond to my request. *
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Submitting…' : form.submitLabel}
      </button>
    </form>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: CmsFormField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const span = field.width === 'half' ? 'md:col-span-1' : 'md:col-span-2';

  if (field.type === 'heading') {
    return (
      <div className="md:col-span-2 pt-2">
        <h3 className="text-lg font-bold text-primary-strong">{field.label}</h3>
      </div>
    );
  }

  const label = (
    <label className="block text-sm font-bold text-primary-strong mb-1">
      {field.label}{field.required && ' *'}
    </label>
  );
  const help = field.helpText ? <p className="text-xs text-ink/50 mt-1">{field.helpText}</p> : null;

  if (field.type === 'textarea') {
    return (
      <div className={span}>
        {label}
        <textarea value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} rows={4} placeholder={field.placeholder} className={inputCls} />
        {help}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className={span}>
        {label}
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="" disabled>Select…</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {help}
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div className={span}>
        {label}
        <div className="flex flex-wrap gap-4 pt-1">
          {(field.options ?? []).map((o) => (
            <label key={o} className="inline-flex items-center gap-2 text-sm text-ink">
              <input type="radio" name={field.name} checked={value === o} onChange={() => onChange(o)} /> {o}
            </label>
          ))}
        </div>
        {help}
      </div>
    );
  }

  if (field.type === 'checkbox') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className={span}>
        {label}
        <div className="flex flex-wrap gap-4 pt-1">
          {(field.options ?? []).map((o) => (
            <label key={o} className="inline-flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={arr.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))}
              /> {o}
            </label>
          ))}
        </div>
        {help}
      </div>
    );
  }

  if (field.type === 'yesno') {
    return (
      <div className={span}>
        {label}
        <div className="flex items-center gap-6 pt-1">
          <label className="inline-flex items-center gap-2 text-sm text-ink">
            <input type="radio" name={field.name} checked={value === true} onChange={() => onChange(true)} /> Yes
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-ink">
            <input type="radio" name={field.name} checked={value === false} onChange={() => onChange(false)} /> No
          </label>
        </div>
        {help}
      </div>
    );
  }

  // text, email, tel, number
  return (
    <div className={span}>
      {label}
      <input
        type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={inputCls}
      />
      {help}
    </div>
  );
}
