import { DDDocStatus, DDDateBasis } from './dd-catalog';

/**
 * Days threshold for the "EXPIRING" (due-soon) state, per the checklist legend:
 *   OK       = present, > 60 days to the due date
 *   EXPIRING = present, within 60 days of the due date (recheck due soon)
 *   EXPIRED  = present, past the due date (recheck overdue)
 *   MISSING  = not on record
 *   NA       = not applicable (e.g. business-only doc for an individual agent)
 *
 * "Due date" depends on the document's date basis:
 *   EXPIRY   - the stored date IS the due date (the document's own expiry).
 *   RECEIVED - due date = received date + recheckMonths (recheck cadence). With
 *              no recheckMonths it's a one-time record: present = OK.
 *   NONE     - no date; present = OK.
 */
export const EXPIRING_WINDOW_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

function addMonthsUTC(date: Date, months: number): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/**
 * The effective due date for a document, or null when nothing is being counted
 * down (NONE basis, no date entered, or a one-time RECEIVED record).
 */
export function effectiveDueDate(
  dateBasis: DDDateBasis,
  recheckMonths: number | undefined,
  date: Date | null | undefined,
): Date | null {
  if (!date) return null;
  if (dateBasis === 'EXPIRY') return date;
  if (dateBasis === 'RECEIVED') return recheckMonths ? addMonthsUTC(date, recheckMonths) : null;
  return null;
}

export function computeDocStatus(opts: {
  present: boolean;
  applicable?: boolean; // default true
  dateBasis: DDDateBasis;
  recheckMonths?: number;
  date?: Date | null; // the entered date (expiry or received, per dateBasis)
  now?: Date;
}): DDDocStatus {
  const { present, dateBasis, recheckMonths, date } = opts;
  const applicable = opts.applicable ?? true;
  const now = opts.now ?? new Date();

  if (!applicable) return 'NA';
  if (!present) return 'MISSING';

  const due = effectiveDueDate(dateBasis, recheckMonths, date ?? null);
  if (!due) return 'OK'; // NONE basis, no date yet, or one-time record

  // Compare by calendar date (UTC): valid *through* the due date, so it only
  // becomes EXPIRED once that date has fully passed (date-only inputs are stored
  // at UTC midnight, so "due today" must not flip mid-day).
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysLeft = Math.round((dueDay - nowDay) / DAY_MS);
  if (daysLeft < 0) return 'EXPIRED';
  if (daysLeft <= EXPIRING_WINDOW_DAYS) return 'EXPIRING';
  return 'OK';
}
