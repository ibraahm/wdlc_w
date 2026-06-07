import { Injectable } from '@nestjs/common';
import { addDays } from 'date-fns';
import { generateToken, hashToken } from './crypto.util';

/**
 * Minimal shape of a Prisma refresh-token delegate (adminRefreshToken / agentRefreshToken).
 * Both tables share the same columns apart from their owner FK (adminId / agentId).
 */
export interface RefreshTokenDelegate {
  create(args: any): Promise<any>;
  findUnique(args: any): Promise<any | null>;
  update(args: any): Promise<any>;
  updateMany(args: any): Promise<any>;
}

export interface RotateOutcome {
  valid: boolean;
  reuseDetected: boolean;
  ownerId?: string;
}

/**
 * Stateless helper that owns all refresh-token mechanics (issue / rotate /
 * revoke), shared by both the admin and agent portals. The caller supplies its
 * own Prisma delegate and owner-key so portal-specific audit/messaging stays in
 * the calling service.
 */
@Injectable()
export class RefreshTokenService {
  /** Creates a new refresh token and returns the raw (un-hashed) value. */
  async issue(
    delegate: RefreshTokenDelegate,
    ownerKey: string,
    ownerId: string,
    days: number,
    ip?: string,
    ua?: string,
  ): Promise<string> {
    const raw = generateToken();
    await delegate.create({
      data: {
        tokenHash: hashToken(raw),
        [ownerKey]: ownerId,
        expiresAt: addDays(new Date(), days),
        ip,
        userAgent: ua,
      },
    });
    return raw;
  }

  /**
   * Rotates a refresh token: revokes the presented token and reports the owner.
   * If the token is missing/expired/already-revoked, all of that owner's active
   * tokens are revoked (reuse defense) and `valid: false` is returned.
   */
  async rotate(delegate: RefreshTokenDelegate, ownerKey: string, rawToken: string): Promise<RotateOutcome> {
    const tokenHash = hashToken(rawToken);
    const stored = await delegate.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      if (stored) {
        await delegate.updateMany({
          where: { [ownerKey]: stored[ownerKey], revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { valid: false, reuseDetected: true, ownerId: stored[ownerKey] };
      }
      return { valid: false, reuseDetected: false };
    }

    await delegate.update({ where: { tokenHash }, data: { revokedAt: new Date() } });
    return { valid: true, reuseDetected: false, ownerId: stored[ownerKey] };
  }

  /** Revokes a single token (logout). */
  async revoke(delegate: RefreshTokenDelegate, ownerKey: string, rawToken: string, ownerId: string): Promise<void> {
    await delegate.updateMany({
      where: { tokenHash: hashToken(rawToken), [ownerKey]: ownerId },
      data: { revokedAt: new Date() },
    });
  }

  /** Revokes every active token for an owner (password change/reset). */
  async revokeAll(delegate: RefreshTokenDelegate, ownerKey: string, ownerId: string): Promise<void> {
    await delegate.updateMany({
      where: { [ownerKey]: ownerId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
