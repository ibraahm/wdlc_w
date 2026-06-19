// Framework-free constants and helpers for the agent application form. Split
// out of AgentApplicationForm.tsx so the form component carries only its
// stateful UI; these have no React dependency and are easy to unit-test.

export const US_COUNTRY = 'United States';
export const US_PHONE_PATTERN = /^[2-9]\d{2}[2-9]\d{6}$/;
export const US_ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;

// Maps a Nominatim country name/code to the single intake country we support.
export function normalizeCountry(name?: string): string {
  if (!name) return '';
  const n = name.toLowerCase();
  if (n.includes('united states')) return US_COUNTRY;
  if (n === 'usa' || n === 'us') return US_COUNTRY;
  return '';
}

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

export const HOW_FOUND = [
  'Advertisement in newspaper / publication', 'Social media (eg Facebook)', 'Word of mouth',
  'World Direct Link sales representative', 'World Direct Link website', 'Other',
];

export const BUSINESS_TYPES = [
  'Check Casher', 'Convenience Store', 'Ethnic Grocery', 'Grocery', 'Liquor Store',
  'Multi Service', 'Pharmacy', 'Port', 'Other', 'Biller (Receiving Payments)',
];

export const PRODUCTS = ['Money Transmission'];

export const LANGUAGES = ['English', 'Spanish', 'French', 'Arabic', 'Somali', 'Amharic', 'Other'];

export const DOLLAR_VOLUMES = ['$0 - $50,000', '$50,000 - $100,000', '$100,000 - $250,000', '$250,000 - $500,000', '$500,000 - $1,000,000', 'Over $1,000,000'];

export const inputCls =
  'w-full rounded-lg border border-[#d9e0e8] bg-white px-3 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';

export const ESIGN_CONSENT_TEXT =
  'I certify that the information in this application is true and complete, and I agree that typing my name below is my electronic signature.';

export function getUsPhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  if (digits.length === 10) return digits;
  return '';
}

export function formatUsPhoneInput(value: string): string {
  const raw = value.replace(/\D/g, '');
  const digits = (raw.length > 10 && raw.startsWith('1') ? raw.slice(1) : raw).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidUsPhone(value: string): boolean {
  return US_PHONE_PATTERN.test(getUsPhoneDigits(value));
}

export function toE164UsPhone(value: string): string {
  return `+1${getUsPhoneDigits(value)}`;
}

export function formatUsZip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidUsZip(value: string): boolean {
  return US_ZIP_PATTERN.test(value.trim());
}
