import { createHash } from 'crypto';

// Headers, in priority order, that a CDN / edge sets with the visitor's country
// (ISO 3166-1 alpha-2). Cloudflare uses CF-IPCountry. The override env lets an
// operator point at whatever their proxy actually sets. We NEVER guess a country
// from anything other than a trusted edge header, so when none is present the
// country is recorded as null rather than fabricated.
const COUNTRY_HEADERS = [
  process.env.GEO_COUNTRY_HEADER?.toLowerCase(),
  'cf-ipcountry',
  'x-vercel-ip-country',
  'x-geo-country',
  'x-country-code',
].filter(Boolean) as string[];

const REGION_HEADERS = ['cf-region', 'x-vercel-ip-country-region', 'x-geo-region'];
const CITY_HEADERS = ['cf-ipcity', 'x-vercel-ip-city', 'x-geo-city'];

type Headers = Record<string, string | string[] | undefined>;

function firstHeader(headers: Headers, names: string[]): string | null {
  for (const name of names) {
    const raw = headers[name];
    const val = Array.isArray(raw) ? raw[0] : raw;
    if (val && val.trim()) return val.trim();
  }
  return null;
}

export function countryFromHeaders(headers: Headers): string | null {
  const c = firstHeader(headers, COUNTRY_HEADERS);
  if (!c) return null;
  const code = c.toUpperCase();
  // Cloudflare emits "XX" (unknown) and "T1" (Tor); treat as unknown.
  if (code === 'XX' || code === 'T1' || !/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

export function regionFromHeaders(headers: Headers): string | null {
  return firstHeader(headers, REGION_HEADERS);
}

export function cityFromHeaders(headers: Headers): string | null {
  return firstHeader(headers, CITY_HEADERS);
}

// Salted SHA-256 of the client IP. Lets us count coarse unique visitors without
// ever storing (or being able to recover) the raw address. The salt is
// per-deployment so hashes are not comparable across environments.
const IP_SALT = process.env.ANALYTICS_IP_SALT || process.env.JWT_SECRET || 'wdlc-analytics';

export function hashIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(`${IP_SALT}:${ip}`).digest('hex').slice(0, 32);
}

// Drop any query string / fragment so we never persist tokens or PII that may
// ride along in a URL. Cap length defensively.
export function normalizePath(path: string | undefined | null): string {
  if (!path) return '/';
  const clean = path.split('?')[0].split('#')[0];
  return (clean || '/').slice(0, 512);
}
