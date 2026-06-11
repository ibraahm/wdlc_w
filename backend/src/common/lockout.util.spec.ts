import { isLocked, nextFailedAttempt, CLEAR_LOCKOUT } from './lockout.util';
import { MAX_FAILED_ATTEMPTS } from './security.constants';

describe('lockout.util', () => {
  describe('isLocked', () => {
    it('is false when lockedUntil is null/undefined', () => {
      expect(isLocked(null)).toBe(false);
      expect(isLocked(undefined)).toBe(false);
    });

    it('is false when the lockout window is in the past', () => {
      expect(isLocked(new Date(Date.now() - 60_000))).toBe(false);
    });

    it('is true when the lockout window is in the future', () => {
      expect(isLocked(new Date(Date.now() + 60_000))).toBe(true);
    });
  });

  describe('nextFailedAttempt', () => {
    it('increments the counter without locking before the threshold', () => {
      const result = nextFailedAttempt(0);
      expect(result.failedAttempts).toBe(1);
      expect(result.lockedUntil).toBeNull();
    });

    it('locks the account once the threshold is reached', () => {
      const result = nextFailedAttempt(MAX_FAILED_ATTEMPTS - 1);
      expect(result.failedAttempts).toBe(MAX_FAILED_ATTEMPTS);
      expect(result.lockedUntil).toBeInstanceOf(Date);
      expect(result.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('CLEAR_LOCKOUT', () => {
    it('resets counter and lockout', () => {
      expect(CLEAR_LOCKOUT).toEqual({ failedAttempts: 0, lockedUntil: null });
    });
  });
});
