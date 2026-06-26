import { computeDocStatus, effectiveDueDate, EXPIRING_WINDOW_DAYS } from './dd-status.util';

const NOW = new Date('2026-01-01T00:00:00Z');
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
const monthsAgo = (n: number) => {
  const d = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - n, NOW.getUTCDate()));
  return d;
};

describe('computeDocStatus', () => {
  it('returns NA when the document is not applicable (e.g. business-only for an individual)', () => {
    expect(computeDocStatus({ present: false, applicable: false, dateBasis: 'EXPIRY', now: NOW })).toBe('NA');
  });

  it('returns MISSING when not present', () => {
    expect(computeDocStatus({ present: false, dateBasis: 'NONE', now: NOW })).toBe('MISSING');
    expect(computeDocStatus({ present: false, dateBasis: 'EXPIRY', date: days(365), now: NOW })).toBe('MISSING');
  });

  it('returns OK for a present NONE-basis document', () => {
    expect(computeDocStatus({ present: true, dateBasis: 'NONE', now: NOW })).toBe('OK');
  });

  // ── EXPIRY basis (the date IS the due date) ──────────────────────────────
  it('EXPIRY: OK beyond the 60-day window, EXPIRING inside it, EXPIRED past', () => {
    expect(computeDocStatus({ present: true, dateBasis: 'EXPIRY', date: days(EXPIRING_WINDOW_DAYS + 1), now: NOW })).toBe('OK');
    expect(computeDocStatus({ present: true, dateBasis: 'EXPIRY', date: days(EXPIRING_WINDOW_DAYS), now: NOW })).toBe('EXPIRING');
    expect(computeDocStatus({ present: true, dateBasis: 'EXPIRY', date: days(-1), now: NOW })).toBe('EXPIRED');
  });

  // ── RECEIVED basis (due = received + recheckMonths) ──────────────────────
  it('RECEIVED: a one-time record (no recheck) is OK once present', () => {
    expect(computeDocStatus({ present: true, dateBasis: 'RECEIVED', date: monthsAgo(60), now: NOW })).toBe('OK');
  });

  it('RECEIVED: recheck not yet due is OK', () => {
    // received 1 month ago, recheck every 12 → due in ~11 months
    expect(computeDocStatus({ present: true, dateBasis: 'RECEIVED', recheckMonths: 12, date: monthsAgo(1), now: NOW })).toBe('OK');
  });

  it('RECEIVED: recheck overdue reads EXPIRED', () => {
    // received 13 months ago, recheck every 12 → overdue
    expect(computeDocStatus({ present: true, dateBasis: 'RECEIVED', recheckMonths: 12, date: monthsAgo(13), now: NOW })).toBe('EXPIRED');
  });

  it('RECEIVED: recheck due within the window reads EXPIRING', () => {
    // received ~11.5 months ago, recheck every 12 → due in ~2 weeks
    expect(computeDocStatus({ present: true, dateBasis: 'RECEIVED', recheckMonths: 12, date: days(-352), now: NOW })).toBe('EXPIRING');
  });

  it('treats a present dated doc with no date recorded as OK', () => {
    expect(computeDocStatus({ present: true, dateBasis: 'EXPIRY', date: null, now: NOW })).toBe('OK');
    expect(computeDocStatus({ present: true, dateBasis: 'RECEIVED', recheckMonths: 12, date: null, now: NOW })).toBe('OK');
  });
});

describe('effectiveDueDate', () => {
  it('EXPIRY returns the date itself; RECEIVED adds the cadence; one-time/NONE returns null', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(effectiveDueDate('EXPIRY', undefined, d)?.toISOString()).toBe(d.toISOString());
    expect(effectiveDueDate('RECEIVED', 12, d)?.toISOString()).toBe(new Date('2027-01-01T00:00:00Z').toISOString());
    expect(effectiveDueDate('RECEIVED', undefined, d)).toBeNull();
    expect(effectiveDueDate('NONE', 12, d)).toBeNull();
    expect(effectiveDueDate('EXPIRY', undefined, null)).toBeNull();
  });
});
