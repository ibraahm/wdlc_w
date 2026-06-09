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

  const msLeft = expiry.getTime() - now.getTime();
  if (msLeft < 0) return 'EXPIRED';
  if (msLeft <= EXPIRING_WINDOW_DAYS * DAY_MS) return 'EXPIRING';
  return 'OK';
}
