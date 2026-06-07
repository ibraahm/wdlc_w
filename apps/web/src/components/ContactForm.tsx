'use client';

import { useState, type FormEvent } from 'react';

export type Field =
  | { name: string; label: string; type: 'text' | 'email' | 'tel'; required?: boolean; optional?: boolean }
  | { name: string; label: string; type: 'textarea'; required?: boolean; optional?: boolean }
  | { name: string; label: string; type: 'select'; options: string[]; required?: boolean; optional?: boolean }
  | { name: string; label: string; type: 'file'; required?: boolean; optional?: boolean };

export default function ContactForm({
  fields,
  submitLabel = 'Submit',
  successMessage = "Thanks — we've received your message and will respond shortly.",
}: {
  fields: Field[];
  submitLabel?: string;
  successMessage?: string;
}) {
  const [submitted, setSubmitted] = useState(false);

  // This is a public marketing site with no public form-intake endpoint yet.
  // Submissions are captured client-side and acknowledged; wire to a backend
  // endpoint when the intake API is available.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
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
          <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.optional && <span className="text-gray-400 font-normal"> (optional)</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              required={field.required}
              rows={5}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          ) : field.type === 'select' ? (
            <select
              id={field.name}
              name={field.name}
              required={field.required}
              defaultValue=""
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
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
              className="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-primary file:font-medium hover:file:bg-blue-100"
            />
          ) : (
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              required={field.required}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-white font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {submitLabel}
      </button>
    </form>
  );
}
