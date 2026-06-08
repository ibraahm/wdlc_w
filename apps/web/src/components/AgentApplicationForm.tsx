'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

// Maps a Nominatim country name to one of our COUNTRIES options.
function normalizeCountry(name?: string): string {
  if (!name) return '';
  const n = name.toLowerCase();
  if (n.includes('united states')) return 'United States';
  if (n === 'usa' || n === 'us') return 'United States';
  const match = COUNTRIES.find((c) => c.toLowerCase() === n);
  return match ?? 'Other';
}

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
  'w-full rounded-lg border border-[#d9e0e8] bg-white px-3 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';

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

interface AddressFill {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (a: AddressFill) => void;
}) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipNextRef = useRef(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch('/api/geocode?q=' + encodeURIComponent(q), { signal: ctrl.signal });
        if (res.ok) {
          const data: NominatimResult[] = await res.json();
          setResults(data);
          setHighlight(-1);
          setOpen(data.length > 0);
        }
      } catch {
        /* aborted or network error — manual entry still works */
      } finally {
        if (abortRef.current === ctrl) setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Splits the first chunk (street) from the remainder for a tidy two-line display.
  function formatResult(r: NominatimResult): { primary: string; secondary: string } {
    const a = r.address;
    const primary = [a.house_number, a.road].filter(Boolean).join(' ') || r.display_name.split(',')[0];
    const secondary = [a.city || a.town || a.village || a.hamlet, a.state, a.postcode, a.country]
      .filter(Boolean)
      .join(', ');
    return { primary, secondary };
  }

  function pick(r: NominatimResult) {
    const a = r.address;
    // Nominatim may match at street level and omit the house number — keep the
    // number the user already typed so "123 Main St" doesn't become "Main St".
    const typedNumber = value.trim().match(/^\d+[a-zA-Z]?/)?.[0];
    const houseNumber = a.house_number || typedNumber;
    const street = [houseNumber, a.road].filter(Boolean).join(' ');
    skipNextRef.current = true;
    onChange(street || r.display_name.split(',')[0]);
    onSelect({
      street: street || r.display_name.split(',')[0],
      city: a.city || a.town || a.village || a.hamlet || '',
      state: a.state || '',
      zip: a.postcode || '',
      country: normalizeCountry(a.country),
    });
    setOpen(false);
    setResults([]);
    setHighlight(-1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        name="businessStreet"
        autoComplete="off"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Start typing an address…"
        className={inputCls}
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary animate-pulse">searching…</span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-lg border border-[#d9e0e8] bg-white shadow-lg max-h-72 overflow-y-auto">
          {results.map((r, i) => {
            const { primary, secondary } = formatResult(r);
            return (
              <li key={`${r.lat}-${r.lon}-${i}`}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(r)}
                  className={`block w-full text-left px-3 py-2 ${i === highlight ? 'bg-primary/10' : 'hover:bg-primary/5'}`}
                >
                  <span className="block text-sm font-medium text-ink">{primary}</span>
                  {secondary && <span className="block text-xs text-ink/55">{secondary}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type ApplicantType = 'INDIVIDUAL' | 'BUSINESS';

function Stepper({ steps, current }: { steps: string[]; current: number }) {
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

export default function AgentApplicationForm() {
  // Wizard state
  const [applicantType, setApplicantType] = useState<ApplicantType | null>(null);
  const [step, setStep] = useState(0); // 0 = type selection

  // Contact
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessTypeOther, setBusinessTypeOther] = useState('');

  // Location
  const [country, setCountry] = useState('United States');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [zip, setZip] = useState('');

  // Services & experience
  const [productsOffered, setProductsOffered] = useState('');
  const [currentlyProvides, setCurrentlyProvides] = useState<boolean | null>(null);
  const [currentProvider, setCurrentProvider] = useState('');
  const [currentProviderOther, setCurrentProviderOther] = useState('');
  const [providedPast, setProvidedPast] = useState<boolean | null>(null);
  const [pastProvider, setPastProvider] = useState('');
  const [pastProviderOther, setPastProviderOther] = useState('');
  const [declinedBefore, setDeclinedBefore] = useState<boolean | null>(null);
  const [declinedExplain, setDeclinedExplain] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [preferredLanguageOther, setPreferredLanguageOther] = useState('');
  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [totalLocations, setTotalLocations] = useState('');

  // Finish
  const [howFound, setHowFound] = useState('');
  const [howFoundOther, setHowFoundOther] = useState('');
  const [comments, setComments] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const isBusiness = applicantType === 'BUSINESS';
  const showState = country === 'United States';
  const showProvince = country === 'Canada';

  const stepLabels = isBusiness
    ? ['Type', 'Business', 'Location', 'Experience', 'Review']
    : ['Type', 'Your details', 'Location', 'Experience', 'Review'];

  function pickType(t: ApplicantType) {
    setApplicantType(t);
    setError('');
    setStep(1);
  }

  // Returns an error string if the current step is incomplete, else ''.
  function validateStep(s: number): string {
    if (s === 1) {
      if (!firstName.trim() || !lastName.trim()) return 'Please enter your first and last name.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return 'Please enter a valid email address.';
      if (!phone.trim()) return 'Please enter a phone number.';
      if (isBusiness) {
        if (!company.trim()) return 'Please enter your company / business name.';
        if (!businessType) return 'Please select your type of business.';
        if (businessType === 'Other' && !businessTypeOther.trim()) return 'Please specify your industry.';
      }
    }
    if (s === 2) {
      if (!street.trim()) return 'Please enter your street address.';
      if (!country) return 'Please select a country.';
      if (!stateField.trim()) return 'Please select / enter your state or region.';
      if (!city.trim()) return 'Please enter your city.';
      if (!zip.trim()) return 'Please enter your ZIP / postal code.';
    }
    if (s === 3) {
      if (!productsOffered) return 'Please choose which products you plan to offer.';
      if (currentlyProvides === null) return 'Please indicate whether you currently provide money transfer services.';
      if (currentlyProvides) {
        if (!currentProvider) return 'Please select your current service provider.';
        if (currentProvider === 'Other' && !currentProviderOther.trim()) return 'Please name your current provider.';
      }
      if (providedPast === null) return 'Please indicate whether you have provided money transfer services in the past.';
      if (providedPast) {
        if (!pastProvider) return 'Please select your past service provider.';
        if (pastProvider === 'Other' && !pastProviderOther.trim()) return 'Please name your past provider.';
      }
      if (declinedBefore === null) return 'Please indicate whether you have been declined or had services cancelled.';
      if (declinedBefore && !declinedExplain.trim()) return 'Please briefly explain.';
      if (preferredLanguage === 'Other' && !preferredLanguageOther.trim()) return 'Please name the preferred language.';
      if (isBusiness) {
        if (!monthlyVolume) return 'Please select your anticipated monthly volume.';
        if (!totalLocations.trim()) return 'Please enter your total number of locations.';
      }
    }
    if (s === 4) {
      if (!howFound) return 'Please tell us how you found out about us.';
      if (howFound === 'Other' && !howFoundOther.trim()) return 'Please specify how you found us.';
      if (!comments.trim()) return 'Please add a comment or note for our team.';
    }
    return '';
  }

  function next() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => Math.min(s + 1, 4));
  }
  function back() {
    setError('');
    setStep((s) => Math.max(s - (step === 1 ? 1 : 1), 0));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err = validateStep(4);
    if (err) { setError(err); return; }
    setError('');
    setPending(true);

    let recaptchaToken: string | undefined;
    if (executeRecaptcha) {
      try {
        recaptchaToken = await executeRecaptcha('agent_application');
      } catch {
        setError('Security check failed. Please try again.');
        setPending(false);
        return;
      }
    }

    const payload = {
      applicantType: applicantType ?? 'BUSINESS',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: isBusiness ? company.trim() : undefined,
      businessStreet: street.trim(),
      businessCountry: country,
      businessState: stateField.trim() || undefined,
      businessCity: city.trim(),
      businessZip: zip.trim(),
      businessPhone: phone.trim(),
      email: email.trim(),
      howFound: howFound || undefined,
      howFoundOther: howFound === 'Other' ? howFoundOther.trim() : undefined,
      businessType: isBusiness ? businessType || undefined : undefined,
      businessTypeOther: isBusiness && businessType === 'Other' ? businessTypeOther.trim() : undefined,
      productsOffered: productsOffered || undefined,
      currentlyProvides: currentlyProvides ?? false,
      currentProvider: currentlyProvides ? currentProvider || undefined : undefined,
      currentProviderOther: currentlyProvides && currentProvider === 'Other' ? currentProviderOther.trim() : undefined,
      providedPast: providedPast ?? false,
      pastProvider: providedPast ? pastProvider || undefined : undefined,
      pastProviderOther: providedPast && pastProvider === 'Other' ? pastProviderOther.trim() : undefined,
      declinedBefore: declinedBefore ?? false,
      declinedExplain: declinedBefore ? declinedExplain.trim() : undefined,
      preferredLanguage: preferredLanguage || undefined,
      preferredLanguageOther: preferredLanguage === 'Other' ? preferredLanguageOther.trim() : undefined,
      monthlyVolume: isBusiness ? monthlyVolume || undefined : undefined,
      totalLocations: isBusiness ? totalLocations.trim() || undefined : undefined,
      comments: comments.trim(),
      recaptchaToken,
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
            Thank you — your {isBusiness ? 'business' : 'individual'} application has been received.
            Our agent onboarding team will be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  // ── Step 0: choose applicant type ──────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-[#d9e0e8]">
          <h1 className="text-2xl font-bold text-primary-strong">Agent Application</h1>
          <p className="text-ink/60 mt-1">Tell us about your business and our onboarding team will follow up.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-primary-strong">How would you like to apply?</h2>
          <p className="text-sm text-ink/60 mt-1">Choose the option that best describes you. We&apos;ll only ask for what&apos;s relevant.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => pickType('INDIVIDUAL')}
            className="group text-left rounded-xl border-2 border-[#d9e0e8] hover:border-primary bg-white p-6 transition-colors focus:outline-none focus:border-primary"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-purple-700 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h3 className="font-bold text-primary-strong">Individual</h3>
            <p className="text-sm text-ink/60 mt-1">Applying as a sole proprietor or an individual without a registered company.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">Continue →</span>
          </button>
          <button
            type="button"
            onClick={() => pickType('BUSINESS')}
            className="group text-left rounded-xl border-2 border-[#d9e0e8] hover:border-primary bg-white p-6 transition-colors focus:outline-none focus:border-primary"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m6-14h6m-6 4h6m-2 4h2" /></svg>
            </div>
            <h3 className="font-bold text-primary-strong">Business / Company</h3>
            <p className="text-sm text-ink/60 mt-1">Applying on behalf of a registered company, store, or multi-location business.</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">Continue →</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="pb-4 border-b border-[#d9e0e8]">
        <h1 className="text-2xl font-bold text-primary-strong">Agent Application</h1>
        <p className="text-ink/60 mt-1">Tell us about your business and our onboarding team will follow up.</p>
      </div>
      <Stepper steps={stepLabels} current={step} />

      <div key={step} className="animate-[fadeIn_240ms_ease]">
        {/* ── Step 1: details ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-primary-strong">{isBusiness ? 'Business contact' : 'Your details'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="First Name" required>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputCls} />
              </Field>
              <Field label="Last Name" required>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required className={inputCls} />
              </Field>
            </div>
            {isBusiness && (
              <>
                <Field label="Company / Business Name" required>
                  <input value={company} onChange={(e) => setCompany(e.target.value)} required className={inputCls} />
                </Field>
                <Field label="Type of Business" required>
                  <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={inputCls}>
                    <option value="" disabled>Select…</option>
                    {BUSINESS_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                {businessType === 'Other' && (
                  <Field label="Enter Industry" required>
                    <input value={businessTypeOther} onChange={(e) => setBusinessTypeOther(e.target.value)} className={inputCls} />
                  </Field>
                )}
              </>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Phone" required>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputCls} />
              </Field>
              <Field label="Email Address" required>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 2: location ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-primary-strong">{isBusiness ? 'Business location' : 'Your address'}</h2>
            <Field label="Street Address" required>
              <AddressAutocomplete
                value={street}
                onChange={setStreet}
                onSelect={(a) => {
                  setCity(a.city);
                  setZip(a.zip);
                  if (a.country) setCountry(a.country);
                  if (a.country === 'United States') {
                    const match = US_STATES.find((s) => s.toLowerCase() === a.state.toLowerCase());
                    if (match) setStateField(match);
                  } else if (a.country === 'Canada') {
                    const match = CA_PROVINCES.find((s) => s.toLowerCase() === a.state.toLowerCase());
                    if (match) setStateField(match);
                  } else {
                    setStateField(a.state);
                  }
                }}
              />
              <p className="mt-1 text-xs text-ink/50">Start typing to search — selecting a result auto-fills city, state and ZIP.</p>
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Country" required>
                <select required value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
                  <option value="" disabled>Select…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              {showState ? (
                <Field label="State" required>
                  <select required className={inputCls} value={stateField} onChange={(e) => setStateField(e.target.value)}>
                    <option value="" disabled>Select…</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              ) : showProvince ? (
                <Field label="Province" required>
                  <select required className={inputCls} value={stateField} onChange={(e) => setStateField(e.target.value)}>
                    <option value="" disabled>Select…</option>
                    {CA_PROVINCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              ) : (
                <Field label="State / Region" required>
                  <input required className={inputCls} value={stateField} onChange={(e) => setStateField(e.target.value)} />
                </Field>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="City" required>
                <input required className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
              </Field>
              <Field label="ZIP / Postal Code" required>
                <input required className={inputCls} value={zip} onChange={(e) => setZip(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 3: services & experience ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-primary-strong">Products &amp; experience</h2>
            <Field label="Which products do you plan to offer to consumers?" required>
              <select value={productsOffered} onChange={(e) => setProductsOffered(e.target.value)} className={inputCls}>
                <option value="" disabled>Select…</option>
                {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <Field label="Do you currently provide money transfer services?" required>
              <YesNo name="currentlyProvides" value={currentlyProvides} onChange={setCurrentlyProvides} />
            </Field>
            {currentlyProvides && (
              <>
                <Field label="Current Service Provider" required>
                  <select value={currentProvider} onChange={(e) => setCurrentProvider(e.target.value)} className={inputCls}>
                    <option value="" disabled>Select…</option>
                    {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                {currentProvider === 'Other' && (
                  <Field label="Enter Other Service" required>
                    <input value={currentProviderOther} onChange={(e) => setCurrentProviderOther(e.target.value)} className={inputCls} />
                  </Field>
                )}
              </>
            )}

            <Field label="Have you provided money transfer services in the past?" required>
              <YesNo name="providedPast" value={providedPast} onChange={setProvidedPast} />
            </Field>
            {providedPast && (
              <>
                <Field label="Past Service Provider" required>
                  <select value={pastProvider} onChange={(e) => setPastProvider(e.target.value)} className={inputCls}>
                    <option value="" disabled>Select…</option>
                    {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                {pastProvider === 'Other' && (
                  <Field label="Enter Other Service" required>
                    <input value={pastProviderOther} onChange={(e) => setPastProviderOther(e.target.value)} className={inputCls} />
                  </Field>
                )}
              </>
            )}

            <Field label="Have you been declined as an agent in the past or had services cancelled?" required>
              <YesNo name="declinedBefore" value={declinedBefore} onChange={setDeclinedBefore} />
            </Field>
            {declinedBefore && (
              <Field label="If Yes — Explain" required>
                <input value={declinedExplain} onChange={(e) => setDeclinedExplain(e.target.value)} className={inputCls} />
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
                <input value={preferredLanguageOther} onChange={(e) => setPreferredLanguageOther(e.target.value)} className={inputCls} />
              </Field>
            )}

            {isBusiness && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Anticipated monthly volume" required>
                  <select value={monthlyVolume} onChange={(e) => setMonthlyVolume(e.target.value)} className={inputCls}>
                    <option value="" disabled>Select…</option>
                    {VOLUMES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Total # of Locations" required>
                  <input value={totalLocations} onChange={(e) => setTotalLocations(e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: review & submit ─────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-primary-strong">Almost done</h2>
            <Field label="How did you find out about us?" required>
              <select value={howFound} onChange={(e) => setHowFound(e.target.value)} className={inputCls}>
                <option value="" disabled>Select…</option>
                {HOW_FOUND.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
            {howFound === 'Other' && (
              <Field label="Please specify" required>
                <input value={howFoundOther} onChange={(e) => setHowFoundOther(e.target.value)} className={inputCls} />
              </Field>
            )}
            <Field label="Comments" required>
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={4} className={inputCls} />
            </Field>

            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm">
              <p className="font-semibold text-primary-strong mb-2">Review summary</p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-ink/70">
                <div><dt className="inline text-ink/45">Type: </dt><dd className="inline">{isBusiness ? 'Business' : 'Individual'}</dd></div>
                <div><dt className="inline text-ink/45">Name: </dt><dd className="inline">{firstName} {lastName}</dd></div>
                {isBusiness && <div><dt className="inline text-ink/45">Company: </dt><dd className="inline">{company}</dd></div>}
                <div><dt className="inline text-ink/45">Email: </dt><dd className="inline">{email}</dd></div>
                <div><dt className="inline text-ink/45">Phone: </dt><dd className="inline">{phone}</dd></div>
                <div><dt className="inline text-ink/45">Location: </dt><dd className="inline">{[city, stateField, country].filter(Boolean).join(', ')}</dd></div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[#a73535] font-medium">{error}</p>}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-1 px-4 py-2.5 rounded-lg border border-[#d9e0e8] text-ink/70 font-semibold hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        {step < 4 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1 px-6 py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-primary-strong transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Continue →
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-primary-strong transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? 'Submitting…' : 'Submit Application'}
          </button>
        )}
      </div>
    </form>
  );
}
