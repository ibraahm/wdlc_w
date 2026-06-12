'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';

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
    country_code?: string;
  };
}

const US_COUNTRY = 'United States';
const US_PHONE_PATTERN = /^[2-9]\d{2}[2-9]\d{6}$/;
const US_ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;

// Maps a Nominatim country name/code to the single intake country we support.
function normalizeCountry(name?: string): string {
  if (!name) return '';
  const n = name.toLowerCase();
  if (n.includes('united states')) return US_COUNTRY;
  if (n === 'usa' || n === 'us') return US_COUNTRY;
  return '';
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
];

const LANGUAGES = ['English', 'Spanish', 'French', 'Arabic', 'Somali', 'Amharic', 'Other'];

const VOLUMES = ['1 - 50 items', '51 - 250 items', '251 - 1,000 items', 'Over 1,000 items'];

const inputCls =
  'w-full rounded-lg border border-[#d9e0e8] bg-white px-3 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';

const ESIGN_CONSENT_TEXT =
  'I certify that the information in this application is true and complete, and I agree that typing my name below is my electronic signature.';

function getUsPhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  if (digits.length === 10) return digits;
  return '';
}

function formatUsPhoneInput(value: string): string {
  const raw = value.replace(/\D/g, '');
  const digits = (raw.length > 10 && raw.startsWith('1') ? raw.slice(1) : raw).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidUsPhone(value: string): boolean {
  return US_PHONE_PATTERN.test(getUsPhoneDigits(value));
}

function toE164UsPhone(value: string): string {
  return `+1${getUsPhoneDigits(value)}`;
}

function formatUsZip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function isValidUsZip(value: string): boolean {
  return US_ZIP_PATTERN.test(value.trim());
}

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
          const usResults = data.filter((r) => {
            const countryCode = r.address.country_code?.toLowerCase();
            return countryCode === 'us' || normalizeCountry(r.address.country) === US_COUNTRY;
          });
          setResults(usResults);
          setHighlight(-1);
          setOpen(usResults.length > 0);
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
    const country = normalizeCountry(a.country_code || a.country);
    if (country !== US_COUNTRY) return;
    skipNextRef.current = true;
    onChange(street || r.display_name.split(',')[0]);
    onSelect({
      street: street || r.display_name.split(',')[0],
      city: a.city || a.town || a.village || a.hamlet || '',
      state: a.state || '',
      zip: formatUsZip(a.postcode || ''),
      country,
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
        name="wdlc-street-entry"
        autoComplete="new-password"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Start typing a U.S. street address..."
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

interface AgentApplicationFormProps {
  // Minutes of inactivity before a locally saved draft is considered expired.
  draftTimeoutMinutes?: number;
  // CMS-controlled select options (admin → Forms → Agent Application). Fall back
  // to the built-in lists when the CMS has nothing configured.
  businessTypeOptions?: string[];
  productOptions?: string[];
  howFoundOptions?: string[];
}

interface HumanVerificationChallenge {
  question: string;
  token: string;
  expiresAt: string;
}

interface ZipLookupResult {
  city: string;
  state: string;
  zip: string;
}

const DRAFT_KEY = 'wdlc.agentApplication.draft';

export default function AgentApplicationForm({
  draftTimeoutMinutes = 30,
  businessTypeOptions,
  howFoundOptions,
}: AgentApplicationFormProps = {}) {
  // CMS options with built-in fallbacks.
  const businessTypeList = businessTypeOptions?.length ? businessTypeOptions : BUSINESS_TYPES;
  const productList = PRODUCTS;
  const howFoundList = howFoundOptions?.length ? howFoundOptions : HOW_FOUND;

  // Wizard state
  const [applicantType, setApplicantType] = useState<ApplicantType | null>(null);
  const [step, setStep] = useState(0); // 0 = type selection
  const [draftRestored, setDraftRestored] = useState(false);

  // Contact
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessTypeOther, setBusinessTypeOther] = useState('');

  // Location
  const [country, setCountry] = useState(US_COUNTRY);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [zip, setZip] = useState('');

  // Services & experience
  const [productsOffered, setProductsOffered] = useState('');
  const [currentlyProvides, setCurrentlyProvides] = useState<boolean | null>(null);
  const [currentProvider, setCurrentProvider] = useState('');
  const [providedPast, setProvidedPast] = useState<boolean | null>(null);
  const [pastProvider, setPastProvider] = useState('');
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
  const [signatureName, setSignatureName] = useState('');
  const [signatureTitle, setSignatureTitle] = useState('');
  const [signatureConsent, setSignatureConsent] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [zipLookupLoading, setZipLookupLoading] = useState(false);
  const [zipLookupMessage, setZipLookupMessage] = useState('');
  const [humanChallenge, setHumanChallenge] = useState<HumanVerificationChallenge | null>(null);
  const [humanAnswer, setHumanAnswer] = useState('');
  const [humanLoading, setHumanLoading] = useState(false);
  const [humanError, setHumanError] = useState('');
  const showHumanVerification = true;

  const isBusiness = applicantType === 'BUSINESS';

  async function loadHumanChallenge() {
    setHumanLoading(true);
    setHumanError('');
    try {
      const res = await fetch('/api/human-verification/challenge?context=agent_application', {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.question || !data.token) {
        throw new Error(data.error || 'Verification question unavailable');
      }
      setHumanChallenge(data as HumanVerificationChallenge);
      setHumanAnswer('');
      if (process.env.NODE_ENV !== 'production') {
        console.info('[agent-application] human-verification:challenge loaded', {
          expiresAt: data.expiresAt,
        });
      }
    } catch (err) {
      const message = 'Verification question unavailable. Please try again.';
      setHumanError(message);
      if (process.env.NODE_ENV !== 'production') {
        console.error('[agent-application] human-verification:challenge failed', {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      setHumanLoading(false);
    }
  }

  // ── Draft auto-save (localStorage) with a CMS-configured expiry ────────────
  // Restore a saved draft on mount if it hasn't expired.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) { setDraftRestored(true); return; }
      const saved = JSON.parse(raw) as { savedAt: number; data: Record<string, unknown> };
      const ageMin = (Date.now() - saved.savedAt) / 60000;
      if (ageMin > draftTimeoutMinutes) {
        localStorage.removeItem(DRAFT_KEY);
        setDraftRestored(true);
        return;
      }
      const d = saved.data;
      if (d.applicantType) setApplicantType(d.applicantType as ApplicantType);
      if (typeof d.step === 'number') setStep(d.step);
      setFirstName((d.firstName as string) ?? '');
      setLastName((d.lastName as string) ?? '');
      setEmail((d.email as string) ?? '');
      setPhone(formatUsPhoneInput((d.phone as string) ?? ''));
      setCompany((d.company as string) ?? '');
      setBusinessType((d.businessType as string) ?? '');
      setBusinessTypeOther((d.businessTypeOther as string) ?? '');
      setCountry(US_COUNTRY);
      setStreet((d.street as string) ?? '');
      setCity((d.city as string) ?? '');
      const savedState = (d.stateField as string) ?? '';
      setStateField(US_STATES.includes(savedState) ? savedState : '');
      setZip(formatUsZip((d.zip as string) ?? ''));
      setProductsOffered((d.productsOffered as string) ?? '');
      setCurrentProvider((d.currentProvider as string) ?? '');
      setPastProvider((d.pastProvider as string) ?? '');
      setMonthlyVolume((d.monthlyVolume as string) ?? '');
      setTotalLocations((d.totalLocations as string) ?? '');
      setHowFound((d.howFound as string) ?? '');
      setHowFoundOther((d.howFoundOther as string) ?? '');
      setComments((d.comments as string) ?? '');
      setSignatureName((d.signatureName as string) ?? '');
      setSignatureTitle((d.signatureTitle as string) ?? '');
      setSignatureConsent((d.signatureConsent as boolean) ?? false);
    } catch {
      /* ignore corrupt draft */
    }
    setDraftRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist a draft whenever the user advances past the type selector.
  useEffect(() => {
    if (!draftRestored || submitted) return;
    if (step === 0 && !applicantType) return;
    const data = {
      applicantType, step, firstName, lastName, email, phone, company, businessType,
      businessTypeOther, country, street, city, stateField, zip, productsOffered,
      currentProvider, pastProvider, monthlyVolume, totalLocations, howFound,
      howFoundOther, comments, signatureName, signatureTitle, signatureConsent,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    } catch {
      /* storage full / unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicantType, step, firstName, lastName, email, phone, company, businessType,
      businessTypeOther, country, street, city, stateField, zip, productsOffered,
      currentProvider, pastProvider, monthlyVolume, totalLocations, howFound,
      howFoundOther, comments, signatureName, signatureTitle, signatureConsent]);

  useEffect(() => {
    if (step !== 4 || humanChallenge || humanLoading) return;
    void loadHumanChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, humanChallenge, humanLoading]);

  useEffect(() => {
    if (currentlyProvides !== false) return;
    setCurrentProvider('');
  }, [currentlyProvides]);

  useEffect(() => {
    if (providedPast !== false) return;
    setPastProvider('');
  }, [providedPast]);

  useEffect(() => {
    const zip5 = zip.replace(/\D/g, '').slice(0, 5);
    if (zip5.length !== 5) {
      setZipLookupMessage('');
      return;
    }

    const ctrl = new AbortController();
    setZipLookupLoading(true);
    setZipLookupMessage('');

    fetch(`/api/zip-lookup?zip=${zip5}`, { signal: ctrl.signal, cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.city || !data.state) {
          throw new Error(data.error || 'ZIP lookup unavailable');
        }
        const result = data as ZipLookupResult;
        setCity(result.city);
        const match = US_STATES.find((s) => s.toLowerCase() === result.state.toLowerCase());
        if (match) setStateField(match);
        setZipLookupMessage('City and state filled from ZIP.');
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        setZipLookupMessage('ZIP lookup unavailable. Please enter city and state.');
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setZipLookupLoading(false);
      });

    return () => ctrl.abort();
  }, [zip]);

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
      if (!isValidUsPhone(phone)) return 'Please enter a valid U.S. phone number.';
      if (isBusiness) {
        if (!company.trim()) return 'Please enter your company / business name.';
        if (!businessType) return 'Please select your type of business.';
        if (businessType === 'Other' && !businessTypeOther.trim()) return 'Please specify your industry.';
      }
    }
    if (s === 2) {
      if (!street.trim()) return 'Please enter your street address.';
      if (country !== US_COUNTRY) return 'Agent applications are currently available for U.S. locations only.';
      if (!US_STATES.includes(stateField)) return 'Please select a U.S. state.';
      if (!city.trim()) return 'Please enter your city.';
      if (!zip.trim()) return 'Please enter your ZIP code.';
      if (!isValidUsZip(zip)) return 'Please enter a valid U.S. ZIP code.';
    }
    if (s === 3) {
      if (!productsOffered || !PRODUCTS.includes(productsOffered)) return 'Please choose which products you plan to offer.';
      if (currentlyProvides === null) return 'Please indicate whether you currently offer money transfer services.';
      if (currentlyProvides && !currentProvider.trim()) return 'Please enter the company name for current money transfer services.';
      if (providedPast === null) return 'Please indicate whether you have offered money transfer services in the past.';
      if (providedPast && !pastProvider.trim()) return 'Please enter the company name for past money transfer services.';
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
      if (!signatureName.trim()) return 'Please type your full legal name as your electronic signature.';
      if (!signatureConsent) return 'Please accept the electronic signature certification.';
      if (showHumanVerification) {
        if (humanError) return humanError;
        if (!humanChallenge) return 'Verification question is loading. Please try again.';
        if (!humanAnswer.trim()) return 'Please answer the verification question.';
      }
    }
    return '';
  }

  function validateApplication(): { step: number; error: string } {
    for (const s of [1, 2, 3, 4]) {
      const err = validateStep(s);
      if (err) return { step: s, error: err };
    }
    return { step: 4, error: '' };
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
    const validation = validateApplication();
    if (validation.error) {
      setStep(validation.step);
      setError(validation.error);
      return;
    }
    setError('');
    setPending(true);

    const humanReady = !!humanChallenge && !!humanAnswer.trim();
    if (process.env.NODE_ENV !== 'production') {
      console.info('[agent-application] submit:start', { applicantType, humanReady });
    }
    if (!humanReady) {
      if (!humanChallenge) void loadHumanChallenge();
      setError('Please answer the verification question.');
      setPending(false);
      return;
    }

    const payload = {
      applicantType: applicantType ?? 'BUSINESS',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: isBusiness ? company.trim() : undefined,
      businessStreet: street.trim(),
      businessCountry: US_COUNTRY,
      businessState: stateField.trim() || undefined,
      businessCity: city.trim(),
      businessZip: zip.trim(),
      businessPhone: toE164UsPhone(phone),
      email: email.trim(),
      howFound: howFound || undefined,
      howFoundOther: howFound === 'Other' ? howFoundOther.trim() : undefined,
      businessType: isBusiness ? businessType || undefined : undefined,
      businessTypeOther: isBusiness && businessType === 'Other' ? businessTypeOther.trim() : undefined,
      productsOffered: productsOffered || undefined,
      currentlyProvides: currentlyProvides ?? false,
      currentProvider: currentlyProvides ? currentProvider.trim() : undefined,
      providedPast: providedPast ?? false,
      pastProvider: providedPast ? pastProvider.trim() : undefined,
      declinedBefore: declinedBefore ?? false,
      declinedExplain: declinedBefore ? declinedExplain.trim() : undefined,
      preferredLanguage: preferredLanguage || undefined,
      preferredLanguageOther: preferredLanguage === 'Other' ? preferredLanguageOther.trim() : undefined,
      monthlyVolume: isBusiness ? monthlyVolume || undefined : undefined,
      totalLocations: isBusiness ? totalLocations.trim() || undefined : undefined,
      comments: comments.trim(),
      signatureName: signatureName.trim(),
      signatureTitle: signatureTitle.trim() || undefined,
      signatureConsent,
      signatureConsentText: ESIGN_CONSENT_TEXT,
      signatureClientTimestamp: new Date().toISOString(),
      humanVerificationToken: humanChallenge?.token,
      humanVerificationAnswer: humanAnswer.trim(),
    };

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[agent-application] api:request', {
          humanTokenPresent: !!payload.humanVerificationToken,
          product: payload.productsOffered,
        });
      }
      const res = await fetch('/api/agent-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (process.env.NODE_ENV !== 'production') {
        console.info('[agent-application] api:response', {
          ok: res.ok,
          status: res.status,
          error: data.error ?? data.message,
        });
      }
      if (!res.ok) {
        const message: string = data.error || data.message || 'Submission failed. Please review the form and try again.';
        if (res.status === 403 || message.toLowerCase().includes('security')) {
          // Challenges are single-use — fetch a fresh question for the retry.
          void loadHumanChallenge();
        }
        setError(message);
        setPending(false);
        return;
      }
      setSubmitted(true);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[agent-application] api:request failed', {
          message: err instanceof Error ? err.message : String(err),
        });
      }
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
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Are you applying as an individual or on behalf of a business?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => pickType('INDIVIDUAL')}
              className="group text-left rounded-xl border-2 border-[#d9e0e8] hover:border-primary bg-white p-4 transition-colors focus:outline-none focus:border-primary"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-700 mb-3">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <p className="font-bold text-primary-strong text-sm">Individual</p>
              <p className="text-xs text-ink/60 mt-0.5">Sole proprietor, no registered company</p>
            </button>
            <button
              type="button"
              onClick={() => pickType('BUSINESS')}
              className="group text-left rounded-xl border-2 border-[#d9e0e8] hover:border-primary bg-white p-4 transition-colors focus:outline-none focus:border-primary"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 mb-3">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m6-14h6m-6 4h6m-2 4h2" /></svg>
              </div>
              <p className="font-bold text-primary-strong text-sm">Business</p>
              <p className="text-xs text-ink/60 mt-0.5">Registered company or multi-location store</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type pill — tap to restart */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Applying as:</span>
        <button
          type="button"
          onClick={() => { setStep(0); setError(''); }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#d9e0e8] bg-white font-medium text-primary-strong hover:bg-gray-50 transition-colors"
        >
          {isBusiness ? '🏢 Business' : '👤 Individual'}
          <span className="text-xs text-gray-400">change</span>
        </button>
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
                    {businessTypeList.map((b) => <option key={b} value={b}>{b}</option>)}
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
                <div className="flex overflow-hidden rounded-lg border border-[#d9e0e8] bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="inline-flex items-center gap-2 border-r border-[#d9e0e8] bg-gray-50 px-3 text-sm font-bold text-primary-strong">
                    <span aria-hidden="true">🇺🇸</span>
                    <span>+1</span>
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatUsPhoneInput(e.target.value))}
                    required
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="(404) 555-0123"
                    className="min-w-0 flex-1 border-0 bg-white px-3 py-2 text-ink focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-ink/50">U.S. numbers only. Area code and prefix cannot start with 0 or 1.</p>
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
              <input
                name="wdlc-street-entry"
                autoComplete="new-password"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street address"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-ink/50">U.S. locations only. City and state fill from ZIP.</p>
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Country" required>
                <div className="flex items-center justify-between rounded-lg border border-[#d9e0e8] bg-gray-50 px-3 py-2 text-ink">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <span aria-hidden="true">🇺🇸</span>
                    <span>{US_COUNTRY}</span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink/45">Locked</span>
                </div>
              </Field>
              <Field label="State" required>
                <select
                  required
                  name="wdlc-state-entry"
                  autoComplete="new-password"
                  className={inputCls}
                  value={stateField}
                  onChange={(e) => setStateField(e.target.value)}
                >
                  <option value="" disabled>Select...</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="City" required>
                <input
                  required
                  name="wdlc-city-entry"
                  autoComplete="new-password"
                  className={inputCls}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Field>
              <Field label="ZIP Code" required>
                <div className="relative">
                  <input
                    required
                    name="wdlc-zip-entry"
                    className={inputCls}
                    value={zip}
                    onChange={(e) => setZip(formatUsZip(e.target.value))}
                    inputMode="numeric"
                    autoComplete="new-password"
                    placeholder="30303"
                  />
                  {zipLookupLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary animate-pulse">checking...</span>
                  )}
                </div>
                {zipLookupMessage && (
                  <p className={`mt-1 text-xs ${zipLookupMessage.includes('filled') ? 'text-emerald-700' : 'text-[#a73535]'}`}>
                    {zipLookupMessage}
                  </p>
                )}
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
                {productList.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <Field label="Do you currently offer money transfer services?" required>
              <YesNo name="currentlyProvides" value={currentlyProvides} onChange={setCurrentlyProvides} />
            </Field>
            {currentlyProvides && (
              <Field label="Current company name" required>
                <input value={currentProvider} onChange={(e) => setCurrentProvider(e.target.value)} className={inputCls} />
              </Field>
            )}

            <Field label="Have you offered money transfer services in the past?" required>
              <YesNo name="providedPast" value={providedPast} onChange={setProvidedPast} />
            </Field>
            {providedPast && (
              <Field label="Previous company name" required>
                <input value={pastProvider} onChange={(e) => setPastProvider(e.target.value)} className={inputCls} />
              </Field>
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
                {howFoundList.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
            {howFound === 'Other' && (
              <Field label="Please specify" required>
                <input value={howFoundOther} onChange={(e) => setHowFoundOther(e.target.value)} className={inputCls} />
              </Field>
            )}
            <Field label="Anything else you'd like us to know? (optional)">
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} placeholder="Questions, notes, or context for our team…" className={inputCls} />
            </Field>

            <div className="rounded-lg border border-[#d9e0e8] bg-white p-4">
              <p className="text-sm font-bold text-primary-strong mb-3">Electronic signature</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full legal name" required>
                  <input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Title / role">
                  <input value={signatureTitle} onChange={(e) => setSignatureTitle(e.target.value)} className={inputCls} />
                </Field>
              </div>
              <label className="mt-4 flex items-start gap-3 text-sm text-ink/75">
                <input
                  type="checkbox"
                  checked={signatureConsent}
                  onChange={(e) => setSignatureConsent(e.target.checked)}
                  className="mt-1"
                />
                <span>{ESIGN_CONSENT_TEXT}</span>
              </label>
            </div>

            {showHumanVerification && (
              <Field label={humanChallenge?.question ?? 'Human verification'} required>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={humanAnswer}
                    onChange={(e) => setHumanAnswer(e.target.value)}
                    inputMode="numeric"
                    pattern="-?[0-9]*"
                    disabled={!humanChallenge || humanLoading}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={loadHumanChallenge}
                    disabled={humanLoading}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-[#d9e0e8] text-ink/70 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    {humanLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                {humanError && <p className="mt-1 text-xs text-[#a73535] font-medium">{humanError}</p>}
              </Field>
            )}

            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm">
              <p className="font-semibold text-primary-strong mb-2">Review summary</p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-ink/70">
                <div><dt className="inline text-ink/45">Type: </dt><dd className="inline">{isBusiness ? 'Business' : 'Individual'}</dd></div>
                <div><dt className="inline text-ink/45">Name: </dt><dd className="inline">{firstName} {lastName}</dd></div>
                {isBusiness && <div><dt className="inline text-ink/45">Company: </dt><dd className="inline">{company}</dd></div>}
                <div><dt className="inline text-ink/45">Email: </dt><dd className="inline">{email}</dd></div>
                <div><dt className="inline text-ink/45">Phone: </dt><dd className="inline">{phone}</dd></div>
                <div><dt className="inline text-ink/45">Location: </dt><dd className="inline">{[city, stateField, country].filter(Boolean).join(', ')}</dd></div>
                {currentlyProvides && <div><dt className="inline text-ink/45">Current company: </dt><dd className="inline">{currentProvider}</dd></div>}
                {providedPast && <div><dt className="inline text-ink/45">Previous company: </dt><dd className="inline">{pastProvider}</dd></div>}
                {signatureName && <div><dt className="inline text-ink/45">Signed by: </dt><dd className="inline">{signatureName}</dd></div>}
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
