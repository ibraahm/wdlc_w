// Shared constants for the agent DD checklist UI, used by both DDFileDetail
// (the page shell) and DocRow (a single checklist line). Kept in their own
// module so the two components don't have to import from each other.

export const ONBOARDING_SECTIONS = new Set(['DOCUMENTATION', 'COMPLIANCE']);

// Statuses that need reviewer attention (drives filters and row highlighting).
export const ATTENTION = new Set(['MISSING', 'EXPIRED', 'EXPIRING']);

// Viable date window for expiry / next-due dates (rejects typos like year 0005).
export const DATE_MIN = '2000-01-01';
export const DATE_MAX_YEAR = new Date().getFullYear() + 30;
export const DATE_MAX = `${DATE_MAX_YEAR}-12-31`;
