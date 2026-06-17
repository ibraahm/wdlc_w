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

export interface DDCatalogItem {
  code: string; // stable row key r0..r18
  section: DDSection;
  label: string;
  hasExpiry: boolean;
  businessOnly?: boolean;
  // Recurring cadence in months for periodic items, used to suggest the next
  // due date when a review is recorded (e.g. annual = 12).
  renewMonths?: number;
}

export const DD_CATALOG: DDCatalogItem[] = [
  // 1. DOCUMENTATION
  { code: 'r0', section: 'DOCUMENTATION', label: 'Signed application', hasExpiry: false },
  { code: 'r1', section: 'DOCUMENTATION', label: 'Business license & permit (if applicable)', hasExpiry: true, businessOnly: true },
  { code: 'r2', section: 'DOCUMENTATION', label: 'Signed agent agreement (state-specific sections highlighted)', hasExpiry: true },
  { code: 'r3', section: 'DOCUMENTATION', label: 'EIN / Taxpayer ID', hasExpiry: false },
  { code: 'r4', section: 'DOCUMENTATION', label: 'Proof of physical premises (in authorized delegate / business name)', hasExpiry: true },
  { code: 'r5', section: 'DOCUMENTATION', label: 'Valid government ID (per principal)', hasExpiry: true },

  // 2. COMPLIANCE DOCUMENTATION
  { code: 'r6', section: 'COMPLIANCE', label: 'OFAC screening - all employees with transaction access', hasExpiry: true },
  { code: 'r7', section: 'COMPLIANCE', label: 'Adverse media screening (per principal)', hasExpiry: true },
  { code: 'r8', section: 'COMPLIANCE', label: 'Background check and credit report (per principal)', hasExpiry: true },
  { code: 'r9', section: 'COMPLIANCE', label: 'BSA training (initial)', hasExpiry: true },
  { code: 'r10', section: 'COMPLIANCE', label: 'AML acknowledgement form', hasExpiry: true },
  { code: 'r11', section: 'COMPLIANCE', label: 'Anticipated volume form', hasExpiry: false },

  // 3. ONGOING DUE DILIGENCE
  { code: 'r12', section: 'ONGOING', label: 'BSA training (periodic - annual)', hasExpiry: true, renewMonths: 12 },
  { code: 'r13', section: 'ONGOING', label: 'AML acknowledgement renewal (annual)', hasExpiry: true, renewMonths: 12 },
  { code: 'r14', section: 'ONGOING', label: 'OFAC re-screen (annual)', hasExpiry: true, renewMonths: 12 },
  { code: 'r15', section: 'ONGOING', label: 'Location verification (Google Maps)', hasExpiry: true, renewMonths: 12 },
  { code: 'r16', section: 'ONGOING', label: 'Agent visit & onsite review report (risk-based; high/medium every 3–6 months)', hasExpiry: true, renewMonths: 6 },
  { code: 'r17', section: 'ONGOING', label: 'Credit / financial review (annual)', hasExpiry: true, renewMonths: 12 },
  { code: 'r18', section: 'ONGOING', label: 'Annual review summary', hasExpiry: true, renewMonths: 12 },
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
