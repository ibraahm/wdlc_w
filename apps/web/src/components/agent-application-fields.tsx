'use client';

import type { ReactNode } from 'react';

// Small presentational building blocks for the agent application form, split
// out of AgentApplicationForm.tsx to keep that file focused on form state.

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-primary-strong mb-1">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

export function YesNo({ name, value, onChange }: { name: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-6 pt-1">
      <label className="inline-flex items-center gap-2 text-sm text-ink">
        <input type="radio" name={name} checked={value === true} onChange={() => onChange(true)} /> Yes
      </label>
      <label className="inline-flex items-center gap-2 text-sm text-ink">
        <input type="radio" name={name} checked={value === false} onChange={() => onChange(false)} /> No
      </label>
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center w-full mb-8">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center text-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  done ? 'bg-primary text-white' : active ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`mt-1 hidden sm:block text-[11px] font-medium ${active ? 'text-primary' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 rounded transition-colors ${done ? 'bg-primary' : 'bg-gray-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
