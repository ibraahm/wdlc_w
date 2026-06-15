'use client';

import { useState, type FormEvent } from 'react';
import { HumanVerificationField, useHumanVerification } from './HumanVerification';

export type Field =
  | { name: string; label: string; type: 'text' | 'email' | 'tel'; required?: boolean; optional?: boolean }
  | { name: string; label: string; type: 'textarea'; required?: boolean; optional?: boolean }
  | { name: string; label: string; type: 'select'; options: string[]; required?: boolean; optional?: boolean }
  | { name: string; label: string; type: 'file'; required?: boolean; optional?: boolean };


export default function ContactForm({
  fields,
  submitLabel = 'Submit',
  successMessage = "Thanks - we've received your message and will respond shortly.",
  action = 'form_submit',
  /** CMS form slug to POST submissions to. When omitted the form is display-only. */
  formSlug,
}: {
  fields: Field[];
  submitLabel?: string;
  successMessage?: string;
  action?: string;
  formSlug?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const showHumanVerification = !!formSlug;
  const humanVerification = useHumanVerification(action, showHumanVerification);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setPending(true);

    if (formSlug) {
      if (!humanVerification.challenge || !humanVerification.answer.trim()) {
        setError('Please answer the verification question.');
        setPending(false);
        return;
      }

      const form = e.currentTarget;
      const data: Record<string, string> = {};
      for (const field of fields) {
        const el = form.elements.namedItem(field.name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (el) data[field.name] = el.value;
      }
      try {
        const res = await fetch(`/api/form-submit/${formSlug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data,
            verificationAction: action,
            humanVerificationToken: humanVerification.challenge?.token,
            humanVerificationAnswer: humanVerification.answer.trim(),
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.message || 'Submission failed. Please try again.');
        }
      } catch (err) {
        if ((err instanceof Error ? err.message : '').toLowerCase().includes('security')) {
          void humanVerification.refresh(); // challenge is single-use - get a fresh one
          setError('Please answer the refreshed verification question and submit again.');
          setPending(false);
          return;
        }
        setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
        setPending(false);
        return;
      }
    }

    setSubmitted(true);
    setPending(false);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-900">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">{successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-bold text-primary-strong mb-1">
            {field.label}
            {field.optional && <span className="text-muted font-normal"> (optional)</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              required={field.required}
              rows={5}
              className="w-full rounded-lg border border-[#d9e0e8] px-3 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          ) : field.type === 'select' ? (
            <select
              id={field.name}
              name={field.name}
              required={field.required}
              defaultValue=""
              className="w-full rounded-lg border border-[#d9e0e8] px-3 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="" disabled>Select…</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'file' ? (
            <input
              id={field.name}
              name={field.name}
              type="file"
              required={field.required}
              className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-[#fff4cc] file:px-4 file:py-2 file:text-primary file:font-bold hover:file:bg-secondary/20"
            />
          ) : (
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              required={field.required}
              className="w-full rounded-lg border border-[#d9e0e8] px-3 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          )}
        </div>
      ))}

      {showHumanVerification && (
        <HumanVerificationField
          answer={humanVerification.answer}
          challenge={humanVerification.challenge}
          error={humanVerification.error}
          loading={humanVerification.loading}
          onAnswerChange={humanVerification.setAnswer}
          onRefresh={() => {
            void humanVerification.refresh();
          }}
        />
      )}

      {error && (
        <p className="text-sm text-[#a73535] font-medium">{error}</p>
      )}

      <div className="flex items-start gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-strong transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Sending…
            </>
          ) : submitLabel}
        </button>
      </div>
    </form>
  );
}
