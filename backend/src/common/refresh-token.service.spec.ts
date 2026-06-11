import { RefreshTokenService, RefreshTokenDelegate } from './refresh-token.service';
import { hashToken } from './crypto.util';

/**
 * In-memory fake of a Prisma refresh-token delegate. Records are keyed by
 * tokenHash so we can assert on revocation state directly.
 */
function makeDelegate(initial: Record<string, any>[] = []): RefreshTokenDelegate & {
  rows: Record<string, any>[];
} {
  const rows = [...initial];
  return {
    rows,
    create: jest.fn(async ({ data }) => {
      // Prisma defaults the nullable revokedAt column to null on insert.
      const row = { revokedAt: null, ...data };
      rows.push(row);
      return row;
    }),
    findUnique: jest.fn(async ({ where }) => {
      return rows.find((r) => r.tokenHash === where.tokenHash) ?? null;
    }),
    update: jest.fn(async ({ where, data }) => {
      const row = rows.find((r) => r.tokenHash === where.tokenHash);
      if (row) Object.assign(row, data);
      return row;
    }),
    updateMany: jest.fn(async ({ where, data }) => {
      let count = 0;
      for (const row of rows) {
        const ownerMatch = Object.keys(where)
          .filter((k) => k !== 'revokedAt' && k !== 'tokenHash')
          .every((k) => row[k] === where[k]);
        const revokedMatch = !('revokedAt' in where) || row.revokedAt === where.revokedAt;
        const hashMatch = !('tokenHash' in where) || row.tokenHash === where.tokenHash;
        if (ownerMatch && revokedMatch && hashMatch) {
          Object.assign(row, data);
          count++;
        }
      }
      return { count };
    }),
  };
}

const OWNER_KEY = 'adminId';
const OWNER_ID = 'admin-1';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

  beforeEach(() => {
    service = new RefreshTokenService();
  });

  describe('issue', () => {
    it('stores the hashed token, never the raw value, and returns the raw token', async () => {
      const delegate = makeDelegate();
      const raw = await service.issue(delegate, OWNER_KEY, OWNER_ID, 30, '1.2.3.4', 'ua');

      expect(raw).toEqual(expect.any(String));
      expect(delegate.rows).toHaveLength(1);
      expect(delegate.rows[0].tokenHash).toBe(hashToken(raw));
      expect(delegate.rows[0].tokenHash).not.toBe(raw);
      expect(delegate.rows[0][OWNER_KEY]).toBe(OWNER_ID);
      expect(delegate.rows[0].ip).toBe('1.2.3.4');
    });
  });

  describe('rotate', () => {
    it('returns valid + owner and revokes the presented token when active', async () => {
      const delegate = makeDelegate();
      const raw = await service.issue(delegate, OWNER_KEY, OWNER_ID, 30);

      const outcome = await service.rotate(delegate, OWNER_KEY, raw);

      expect(outcome).toEqual({ valid: true, reuseDetected: false, ownerId: OWNER_ID });
      expect(delegate.rows[0].revokedAt).toBeInstanceOf(Date);
    });

    it('returns invalid without reuse when the token is unknown', async () => {
      const delegate = makeDelegate();

      const outcome = await service.rotate(delegate, OWNER_KEY, 'never-issued');

      expect(outcome).toEqual({ valid: false, reuseDetected: false });
    });

    it('detects reuse and revokes ALL active owner tokens when an already-revoked token is presented', async () => {
      const delegate = makeDelegate();
      const raw = await service.issue(delegate, OWNER_KEY, OWNER_ID, 30);
      const raw2 = await service.issue(delegate, OWNER_KEY, OWNER_ID, 30);
      // First rotate consumes raw (now revoked); raw2 stays active.
      await service.rotate(delegate, OWNER_KEY, raw);

      // Replaying the already-revoked raw token => reuse.
      const outcome = await service.rotate(delegate, OWNER_KEY, raw);

      expect(outcome).toEqual({ valid: false, reuseDetected: true, ownerId: OWNER_ID });
      // raw2 must also be revoked as a defensive measure.
      const raw2Row = delegate.rows.find((r) => r.tokenHash === hashToken(raw2));
      expect(raw2Row?.revokedAt).toBeInstanceOf(Date);
    });

    it('detects reuse and revokes all owner tokens when an expired token is presented', async () => {
      const delegate = makeDelegate();
      // Issue with negative days so it is already expired.
      const raw = await service.issue(delegate, OWNER_KEY, OWNER_ID, -1);

      const outcome = await service.rotate(delegate, OWNER_KEY, raw);

      expect(outcome).toEqual({ valid: false, reuseDetected: true, ownerId: OWNER_ID });
      expect(delegate.rows[0].revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('revoke', () => {
    it('revokes only the matching token for the owner', async () => {
      const delegate = makeDelegate();
      const raw = await service.issue(delegate, OWNER_KEY, OWNER_ID, 30);

      await service.revoke(delegate, OWNER_KEY, raw, OWNER_ID);

      expect(delegate.rows[0].revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('revokeAll', () => {
    it('revokes every active token for the owner', async () => {
      const delegate = makeDelegate();
      await service.issue(delegate, OWNER_KEY, OWNER_ID, 30);
      await service.issue(delegate, OWNER_KEY, OWNER_ID, 30);

      await service.revokeAll(delegate, OWNER_KEY, OWNER_ID);

      expect(delegate.rows.every((r) => r.revokedAt instanceof Date)).toBe(true);
    });
  });
});
