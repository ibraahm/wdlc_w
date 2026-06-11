import { computeDocStatus, EXPIRING_WINDOW_DAYS } from './dd-status.util';

const NOW = new Date('2026-01-01T00:00:00Z');
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe('computeDocStatus', () => {
  it('returns NA when the document is not applicable (e.g. business-only for an individual)', () => {
    expect(computeDocStatus({ present: false, applicable: false, hasExpiry: true, now: NOW })).toBe('NA');
  });

  it('returns MISSING when not present', () => {
    expect(computeDocStatus({ present: false, hasExpiry: false, now: NOW })).toBe('MISSING');
    expect(computeDocStatus({ present: false, hasExpiry: true, expiry: days(365), now: NOW })).toBe('MISSING');
  });

  it('returns OK for a present document with no expiry tracking', () => {
    expect(computeDocStatus({ present: true, hasExpiry: false, now: NOW })).toBe('OK');
  });

  it('returns OK for a present document expiring beyond the 60-day window', () => {
    expect(computeDocStatus({ present: true, hasExpiry: true, expiry: days(EXPIRING_WINDOW_DAYS + 1), now: NOW })).toBe('OK');
  });

  it('returns EXPIRING within the 60-day window (inclusive)', () => {
    expect(computeDocStatus({ present: true, hasExpiry: true, expiry: days(EXPIRING_WINDOW_DAYS), now: NOW })).toBe('EXPIRING');
    expect(computeDocStatus({ present: true, hasExpiry: true, expiry: days(1), now: NOW })).toBe('EXPIRING');
  });

  it('returns EXPIRED past the expiry date', () => {
    expect(computeDocStatus({ present: true, hasExpiry: true, expiry: days(-1), now: NOW })).toBe('EXPIRED');
  });

  it('treats a present expiry-tracked doc with no date as OK (date not yet recorded)', () => {
    expect(computeDocStatus({ present: true, hasExpiry: true, expiry: null, now: NOW })).toBe('OK');
  });
});
