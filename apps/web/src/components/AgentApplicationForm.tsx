'use client';

import { useState, type FormEvent } from 'react';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

const CA_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
  'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
  'Quebec', 'Saskatchewan', 'Yukon',
];

// Common countries first, then a representative list. Kept concise vs the Salesforce example.
const COUNTRIES = [
  'United States', 'Canada', 'Mexico', 'United Kingdom', 'India', 'Philippines', 'Nigeria',
  'Kenya', 'Ethiopia', 'Somalia', 'Ghana', 'Pakistan', 'Bangladesh', 'China', 'Brazil',
  'Colombia', 'Guatemala', 'Honduras', 'El Salvador', 'Dominican Republic', 'Haiti', 'Other',
];

const HOW_FOUND = [
  'Advertisement in newspaper / publication', 'Social media (eg Facebook)', 'Word of mouth',
  'WDL Sales representative', 'WDL website', 'Other',
];

const BUSINESS_TYPES = [
  'Check Casher', 'Convenience Store', 'Ethnic Grocery', 'Grocery', 'Liquor Store',
  'Multi Service', 'Pharmacy', 'Port', 'Other', 'Biller (Receiving Payments)',
];

const PRODUCTS = [
  'Money Transfer - Sends Only', 'Money Transfer - Sends and Receives',
  'Bill Payment', 'All WDL products',
];

const PROVIDERS = [
  'Western Union', 'Ria', 'Vigo', 'MoneyGram', 'Intermex', 'Sigue', 'Order Express',
  'Uniteller', 'Dahabshiil', 'Other',
];

const LANGUAGES = ['English', 'Spanish', 'French', 'Arabic', 'Somali', 'Amharic', 'Other'];

const VOLUMES = ['1 - 50 items', '51 - 250 items', '251 - 1,000 items', 'Over 1,000 items'];

const inputCls =
  'w-full rounded-lg border border-[#d9e0e8] px-3 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-primary-strong mb-1">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

function YesNo({ name, value, onChange }: { name: string; value: boolean | null; onChange: (v: boolean) => void }) {
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

export default function AgentApplicationForm() {
  const [country, setCountry] = useState('');
  const [howFound, setHowFound] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [currentlyProvides, setCurrentlyProvides] = useState<boolean | null>(null);
  const [currentProvider, setCurrentProvider] = useState('');
  const [providedPast, setProvidedPast] = useState<boolean | null>(null);
  const [pastProvider, setPastProvider] = useState('');
  const [declinedBefore, setDeclinedBefore] = useState<boolean | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string)?.trim() || undefined;

    const payload = {
      firstName: get('firstName'),
      lastName: get('lastName'),
      company: get('company'),
      businessStreet: get('businessStreet'),
      businessCountry: country,
      businessState: get('businessState'),
      businessCity: get('businessCity'),
      businessZip: get('businessZip'),
      businessPhone: get('businessPhone'),
      email: get('email'),
      howFound: howFound || undefined,
      howFoundOther: get('howFoundOther'),
      businessType: businessType || undefined,
      businessTypeOther: get('businessTypeOther'),
      productsOffered: get('productsOffered'),
      currentlyProvides: currentlyProvides ?? false,
      currentProvider: currentlyProvides ? currentProvider || undefined : undefined,
      currentProviderOther: currentlyProvides && currentProvider === 'Other' ? get('currentProviderOther') : undefined,
      providedPast: providedPast ?? false,
      pastProvider: providedPast ? pastProvider || undefined : undefined,
      pastProviderOther: providedPast && pastProvider === 'Other' ? get('pastProviderOther') : undefined,
      declinedBefore: declinedBefore ?? false,
      declinedExplain: declinedBefore ? get('declinedExplain') : undefined,
      preferredLanguage: preferredLanguage || undefined,
      preferredLanguageOther: preferredLanguage === 'Other' ? get('preferredLanguageOther') : undefined,
      monthlyVolume: get('monthlyVolume'),
      totalLocations: get('totalLocations'),
      comments: get('comments'),
    };

    try {
      const res = await fetch('/api/agent-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Submission failed. Please review the form and try again.');
        setPending(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Service temporarily unavailable. Please try again later.');
    }
    setPending(false);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-900">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">
            Thank you — your application has been received. Our agent onboarding team will be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  const showState = country === 'United States';
  const showProvince = country === 'Canada';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="First Name" required>
          <input name="firstName" required className={inputCls} />
        </Field>
        <Field label="Last Name" required>
          <input name="lastName" required className={inputCls} />
        </Field>
      </div>

      <Field label="Company" required>
        <input name="company" required className={inputCls} />
      </Field>

      <Field label="Business Street" required>
        <input name="businessStreet" required className={inputCls} />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Business Country" required>
          <select required value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
            <option value="" disabled>Select…</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {showState && (
          <Field label="State" required>
            <select name="businessState" required className={inputCls} defaultValue="">
              <option value="" disabled>Select…</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        {showProvince && (
          <Field label="Province" required>
            <select name="businessState" required className={inputCls} defaultValue="">
              <option value="" disabled>Select…</option>
              {CA_PROVINCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Business City" required>
          <input name="businessCity" required className={inputCls} />
        </Field>
        <Field label="Business Zip / Postal Code" required>
          <input name="businessZip" required className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Business Phone" required>
          <input name="businessPhone" type="tel" required className={inputCls} />
        </Field>
        <Field label="Business Email Address" required>
          <input name="email" type="email" required className={inputCls} />
        </Field>
      </div>

      <Field label="How did you find out about us?" required>
        <select required value={howFound} onChange={(e) => setHowFound(e.target.value)} className={inputCls}>
          <option value="" disabled>Select…</option>
          {HOW_FOUND.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </Field>
      {howFound === 'Other' && (
        <Field label="Please specify" required>
          <input name="howFoundOther" required className={inputCls} />
        </Field>
      )}

      <Field label="Type of Business" required>
        <select required value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={inputCls}>
          <option value="" disabled>Select…</option>
          {BUSINESS_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </Field>
      {businessType === 'Other' && (
        <Field label="Enter Industry" required>
          <input name="businessTypeOther" required className={inputCls} />
        </Field>
      )}

      <Field label="Which products do you plan to offer to consumers?" required>
        <select name="productsOffered" required className={inputCls} defaultValue="">
          <option value="" disabled>Select…</option>
          {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      <Field label="Do you currently provide money transfer services?">
        <YesNo name="currentlyProvides" value={currentlyProvides} onChange={setCurrentlyProvides} />
      </Field>
      {currentlyProvides && (
        <>
          <Field label="Current Service Provider" required>
            <select required value={currentProvider} onChange={(e) => setCurrentProvider(e.target.value)} className={inputCls}>
              <option value="" disabled>Select…</option>
              {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          {currentProvider === 'Other' && (
            <Field label="Enter Other Service" required>
              <input name="currentProviderOther" required className={inputCls} />
            </Field>
          )}
        </>
      )}

      <Field label="Have you provided money transfer services in the past?">
        <YesNo name="providedPast" value={providedPast} onChange={setProvidedPast} />
      </Field>
      {providedPast && (
        <>
          <Field label="Past Service Provider" required>
            <select required value={pastProvider} onChange={(e) => setPastProvider(e.target.value)} className={inputCls}>
              <option value="" disabled>Select…</option>
              {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          {pastProvider === 'Other' && (
            <Field label="Enter Other Service" required>
              <input name="pastProviderOther" required className={inputCls} />
            </Field>
          )}
        </>
      )}

      <Field label="Have you been declined as an agent in the past or had services cancelled?">
        <YesNo name="declinedBefore" value={declinedBefore} onChange={setDeclinedBefore} />
      </Field>
      {declinedBefore && (
        <Field label="If Yes — Explain" required>
          <input name="declinedExplain" required className={inputCls} />
        </Field>
      )}

      <Field label="What is the preferred language for your consumer base?">
        <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} className={inputCls}>
          <option value="">Select…</option>
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </Field>
      {preferredLanguage === 'Other' && (
        <Field label="Enter Other Language" required>
          <input name="preferredLanguageOther" required className={inputCls} />
        </Field>
      )}

      <Field label="Anticipated normal monthly volume for money transfer sends" required>
        <select name="monthlyVolume" required className={inputCls} defaultValue="">
          <option value="" disabled>Select…</option>
          {VOLUMES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>

      <Field label="Total # of Locations" required>
        <input name="totalLocations" required className={inputCls} />
      </Field>

      <Field label="Comments" required>
        <textarea name="comments" required rows={4} className={inputCls} />
      </Field>

      {error && <p className="text-sm text-[#a73535] font-medium">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-strong transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  );
}
