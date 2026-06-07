import { addMinutes } from 'date-fns';
import { MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES } from './security.constants';

/** True if the account is currently within a lockout window. */
export function isLocked(lockedUntil: Date | null | undefined): boolean {
  return !!lockedUntil && lockedUntil > new Date();
}

/**
 * Computes the next failed-attempt counter and lockout timestamp.
 * Locks the account once MAX_FAILED_ATTEMPTS is reached.
 */
export function nextFailedAttempt(current: number): { failedAttempts: number; lockedUntil: Date | null } {
  const failedAttempts = current + 1;
  const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS ? addMinutes(new Date(), LOCKOUT_MINUTES) : null;
  return { failedAttempts, lockedUntil };
}

/** Reset payload applied after a successful login. */
export const CLEAR_LOCKOUT = { failedAttempts: 0, lockedUntil: null };
