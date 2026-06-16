// Location SEO helpers: corridor/keyword constants and schema.org JSON-LD
// builders for the public "Find an Agent" map and per-location pages.
//
// Goal: make every public location unambiguously a "World Direct Link, Corp."
// money-transmission location to Google / Apple / Bing, and surface the markets
// customers actually search for (Somalia, Ethiopia, the wider Horn of Africa,
// all of Africa, and the Middle East) WITHOUT keyword-stuffing or naming
// competitors (which violates map-listing policies and trademark law).

import { company } from './site';
import type { AgentLocation } from './agents';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worlddirectlink.com';

// Services offered at every location — used in copy and JSON-LD serviceType.
export const MONEY_SERVICES = [
  'Money transmission',
  'International money transfer',
  'Remittance services',
  'Cash pickup',
  'Bank deposit transfer',
  'Mobile wallet payout',
  'Bill payment',
] as const;

// Corridors highlighted in page copy. Specific, high-intent markets first.
export const FEATURED_CORRIDORS = [
  'Somalia',
  'Ethiopia',
  'Kenya',
  'Djibouti',
  'Eritrea',
  'Somaliland (Hargeisa)',
  'Sudan',
  'South Sudan',
  'Uganda',
  'Tanzania',
] as const;

// areaServed for structured data: all of Africa + the Middle East. Keeping the
// list explicit (rather than "Africa") helps engines match country-level intent.
export const AFRICA_COUNTRIES = [
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde',
  'Cameroon', 'Central African Republic', 'Chad', 'Comoros', 'Democratic Republic of the Congo',
  'Republic of the Congo', "Côte d'Ivoire", 'Djibouti', 'Egypt', 'Equatorial Guinea',
  'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau',
  'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania',
  'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda',
  'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa',
  'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
] as const;

export const MIDDLE_EAST_COUNTRIES = [
  'Bahrain', 'Cyprus', 'Egypt', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Kuwait', 'Lebanon',
  'Oman', 'Palestine', 'Qatar', 'Saudi Arabia', 'Syria', 'Turkey', 'United Arab Emirates', 'Yemen',
] as const;

// De-duplicated union (Egypt appears in both regions) for areaServed.
export const SERVED_COUNTRIES = Array.from(
  new Set<string>([...AFRICA_COUNTRIES, ...MIDDLE_EAST_COUNTRIES]),
);

export function locationDisplayName(loc: Pick<AgentLocation, 'businessName' | 'city' | 'state'>): string {
  const place = [loc.city, loc.state].filter(Boolean).join(', ');
  if (loc.businessName) return `${loc.businessName}${place ? ` — ${place}` : ''}`;
  return place || 'World Direct Link Agent';
}

export function fullAddress(loc: AgentLocation): string {
  return [loc.addressLine, loc.city, loc.state, loc.zip].filter(Boolean).join(', ');
}

// Serialize JSON-LD safely for embedding in a <script> tag. Escaping "<"
// prevents a "</script>" sequence inside any business name from breaking out
// of the script element (stored-XSS defense in depth for semi-trusted data).
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

const parentOrganization = {
  '@type': 'FinancialService',
  name: company.legalName,
  url: SITE_URL,
  telephone: company.tollFree,
  identifier: { '@type': 'PropertyValue', name: 'NMLS ID', value: company.nmls },
};

const areaServed = SERVED_COUNTRIES.map((name) => ({ '@type': 'Country', name }));

// Per-location FinancialService node.
export function locationJsonLd(loc: AgentLocation, canonicalUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FinancialService',
    '@id': `${canonicalUrl}#location`,
    name: locationDisplayName(loc),
    legalName: company.legalName,
    description:
      `World Direct Link, Corp. authorized money-transmission location` +
      `${loc.city ? ` in ${loc.city}${loc.state ? `, ${loc.state}` : ''}` : ''}. ` +
      `Send money to Somalia, Ethiopia, the Horn of Africa, all of Africa and the Middle East — ` +
      `international money transfer, remittance, cash pickup, bank deposit and mobile wallet payout.`,
    url: canonicalUrl,
    telephone: loc.publicPhone || company.tollFree,
    address: {
      '@type': 'PostalAddress',
      streetAddress: loc.addressLine || undefined,
      addressLocality: loc.city || undefined,
      addressRegion: loc.state || undefined,
      postalCode: loc.zip || undefined,
      addressCountry: loc.country || 'USA',
    },
    geo: { '@type': 'GeoCoordinates', latitude: loc.latitude, longitude: loc.longitude },
    serviceType: [...MONEY_SERVICES],
    areaServed,
    parentOrganization,
  };
}

// Network-level node for the Find an Agent index page.
export function networkJsonLd(locations: AgentLocation[], pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FinancialService',
    name: company.legalName,
    legalName: company.legalName,
    description:
      'World Direct Link, Corp. is a licensed money transmitter and FinCEN-registered ' +
      'Money Services Business offering international money transfer and remittance to Somalia, ' +
      'Ethiopia, the Horn of Africa, all of Africa and the Middle East through a network of ' +
      'authorized agent locations across the United States.',
    url: pageUrl,
    telephone: company.tollFree,
    identifier: { '@type': 'PropertyValue', name: 'NMLS ID', value: company.nmls },
    serviceType: [...MONEY_SERVICES],
    areaServed,
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address.line1,
      addressLocality: company.address.city,
      addressRegion: company.address.state,
      postalCode: company.address.zip,
      addressCountry: 'USA',
    },
    location: locations.slice(0, 100).map((loc) => ({
      '@type': 'FinancialService',
      name: locationDisplayName(loc),
      telephone: loc.publicPhone || undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: loc.addressLine || undefined,
        addressLocality: loc.city || undefined,
        addressRegion: loc.state || undefined,
        postalCode: loc.zip || undefined,
        addressCountry: loc.country || 'USA',
      },
    })),
  };
}
