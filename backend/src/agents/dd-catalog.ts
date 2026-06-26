/**
 * Agent Due Diligence document catalog - the canonical 19-item checklist,
 * transcribed from the company's "Agent Due Diligence File Checklist"
 * (BSA/AML & MSB Compliance Program v6.40, board-approved 2025-10-10).
 *
 * Each agent DD file is seeded with exactly these rows. Files live in Dropbox;
 * this catalog drives the in-app register that tracks presence, expiry, status,
 * notes, and a Dropbox reference per document.
 *
 * `hasExpiry: false` mirrors the source form, where the Signed Application,
 * EIN/Taxpayer ID, and Anticipated Volume Form have no expiry column.
 * `businessOnly: true` items are not required for INDIVIDUAL agents.
 */
export type DDSection = 'DOCUMENTATION' | 'COMPLIANCE' | 'ONGOING';

// How the date stored against a document is interpreted:
//   EXPIRY   - the document's own expiration date (e.g. a government ID,
//              business license). The status counts down to that date.
//   RECEIVED - the date the document/screening was obtained. There is no
//              expiry; instead a recheck is due `recheckMonths` after receipt
//              (per compliance policy). If `recheckMonths` is omitted it is a
//              one-time record (received date kept, never flagged).
//   NONE     - no date applies; present = complete (e.g. signed application).
export type DDDateBasis = 'EXPIRY' | 'RECEIVED' | 'NONE';

export interface DDCatalogItem {
  code: string; // stable row key r0..r18
  section: DDSection;
  label: string;
  dateBasis: DDDateBasis;
  // Recheck cadence in months for RECEIVED items that recur (policy-driven):
  // the next recheck is due this many months after the date received.
  recheckMonths?: number;
  businessOnly?: boolean;
}

export const DD_CATALOG: DDCatalogItem[] = [
  // 1. DOCUMENTATION
  { code: 'r0', section: 'DOCUMENTATION', label: 'Signed application', dateBasis: 'NONE' },
  { code: 'r1', section: 'DOCUMENTATION', label: 'Business license & permit (if applicable)', dateBasis: 'EXPIRY', businessOnly: true },
  { code: 'r2', section: 'DOCUMENTATION', label: 'Signed agent agreement (state-specific sections highlighted)', dateBasis: 'RECEIVED' },
  { code: 'r3', section: 'DOCUMENTATION', label: 'EIN / Taxpayer ID', dateBasis: 'NONE' },
  { code: 'r4', section: 'DOCUMENTATION', label: 'Proof of physical premises (in authorized delegate / business name)', dateBasis: 'RECEIVED' },
  { code: 'r5', section: 'DOCUMENTATION', label: 'Valid government ID (per principal)', dateBasis: 'EXPIRY' },

  // 2. COMPLIANCE DOCUMENTATION (date = received; recheck per policy)
  { code: 'r6', section: 'COMPLIANCE', label: 'OFAC screening - all employees with transaction access', dateBasis: 'RECEIVED', recheckMonths: 12 },
  { code: 'r7', section: 'COMPLIANCE', label: 'Adverse media screening (per principal)', dateBasis: 'RECEIVED', recheckMonths: 12 },
  { code: 'r8', section: 'COMPLIANCE', label: 'Background check and credit report (per principal)', dateBasis: 'RECEIVED', recheckMonths: 24 },
  { code: 'r9', section: 'COMPLIANCE', label: 'BSA training (initial)', dateBasis: 'RECEIVED', recheckMonths: 12 },
  { code: 'r10', section: 'COMPLIANCE', label: 'AML acknowledgement form', dateBasis: 'RECEIVED', recheckMonths: 12 },
  { code: 'r11', section: 'COMPLIANCE', label: 'Anticipated volume form', dateBasis: 'NONE' },

  // 3. ONGOING DUE DILIGENCE (date = last completed; recheck per cadence)
  { code: 'r12', section: 'ONGOING', label: 'BSA training (periodic - annual)', dateBasis: 'RECEIVED', recheckMonths: 12 },
  { code: 'r13', section: 'ONGOING', label: 'AML acknowledgement renewal (annual)', dateBasis: 'RECEIVED', recheckMonths: 12 },
  { code: 'r14', section: 'ONGOING', label: 'OFAC re-screen (annual)', dateBasis: 'RECEIVED', recheckMonths: 12 },
  { code: 'r15', section: 'ONGOING', label: 'Location verification (Google Maps)', dateBasis: 'RECEIVED', recheckMonths: 12 },
  { code: 'r16', section: 'ONGOING', label: 'Agent visit & onsite review report (risk-based; high/medium every 3–6 months)', dateBasis: 'RECEIVED', recheckMonths: 6 },
  { code: 'r17', section: 'ONGOING', label: 'Credit / financial review (annual)', dateBasis: 'RECEIVED', recheckMonths: 12 },
  { code: 'r18', section: 'ONGOING', label: 'Annual review summary', dateBasis: 'RECEIVED', recheckMonths: 12 },
];

/** Lifecycle stages for an agent DD file (application → ongoing → offboarding). */
export const DD_STAGES = [
  'APPLICATION', // lead received, not yet in review
  'UNDER_REVIEW', // application being assessed
  'DD_IN_PROGRESS', // approved-to-onboard; collecting DD documents
  'ACTIVE', // fully onboarded, in good standing
  'SUSPENDED', // temporarily halted (e.g. expired critical docs)
  'TERMINATED', // offboarded
  'REJECTED', // application/onboarding declined
] as const;
export type DDStage = (typeof DD_STAGES)[number];

export const RISK_RATINGS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type RiskRating = (typeof RISK_RATINGS)[number];

/** Per the checklist legend. */
export const DD_DOC_STATUSES = ['OK', 'EXPIRING', 'EXPIRED', 'MISSING', 'NA'] as const;
export type DDDocStatus = (typeof DD_DOC_STATUSES)[number];
