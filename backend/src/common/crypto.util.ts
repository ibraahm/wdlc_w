import { randomBytes, createHash } from 'crypto';

/** Cryptographically random URL-safe token (default 48 bytes = 64 chars base64url). */
export function generateToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 hash of a token - what we store in the DB, never the raw token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
