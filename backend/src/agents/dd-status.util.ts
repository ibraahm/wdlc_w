import { DDDocStatus } from './dd-catalog';

/**
 * Days-to-expiry threshold for the "EXPIRING" state, per the checklist legend:
 *   OK       = present, > 60 days to expiry
 *   EXPIRING = present, within 60 days of expiry
 *   EXPIRED  = present, past the expiry date
 *   MISSING  = not on record
 *   NA       = not applicable (e.g. business-only doc for an individual agent)
 */
export const EXPIRING_WINDOW_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Derives a document's status from whether it's present, applicable, and (if it
 * tracks expiry) how close the expiry is. `hasExpiry: false` documents are OK
 * once present. Pass `now` for deterministic testing.
 */
export function computeDocStatus(opts: {
  present: boolean;
  applicable?: boolean; // default true
  hasExpiry: boolean;
  expiry?: Date | null;
  now?: Date;
}): DDDocStatus {
  const { present, hasExpiry, expiry } = opts;
  const applicable = opts.applicable ?? true;
  const now = opts.now ?? new Date();

  if (!applicable) return 'NA';
  if (!present) return 'MISSING';
  if (!hasExpiry || !expiry) return 'OK';

  // Compare by calendar date (UTC): a document is valid *through* its expiry
  // date, so it only becomes EXPIRED once that date has fully passed. Anchoring
  // to the date also makes the result independent of the time-of-day component
  // stored on the value (date-only inputs are persisted at UTC midnight, so a
  // doc expiring "today" must not flip to EXPIRED partway through the day).
  const expDay = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysLeft = Math.round((expDay - nowDay) / DAY_MS);
  if (daysLeft < 0) return 'EXPIRED';
  if (daysLeft <= EXPIRING_WINDOW_DAYS) return 'EXPIRING';
  return 'OK';
}
