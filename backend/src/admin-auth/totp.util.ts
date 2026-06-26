import { createHmac, randomBytes } from 'crypto';

// RFC 6238 TOTP (SHA-1, 6 digits, 30s) implemented with Node crypto so no
// third-party dependency is needed. Compatible with Google Authenticator, Authy,
// 1Password, etc.

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(bytes = 20): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of randomBytes(bytes)) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function fromBase32(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Verify a 6-digit token, allowing ±`window` 30s steps for clock skew.
export function verifyTotp(token: string | undefined, base32Secret: string | null | undefined, window = 1, step = 30): boolean {
  if (!token || !base32Secret || !/^\d{6}$/.test(token.trim())) return false;
  const secret = fromBase32(base32Secret);
  if (secret.length === 0) return false;
  const counter = Math.floor(Date.now() / 1000 / step);
  for (let w = -window; w <= window; w++) {
    if (safeEqual(hotp(secret, counter + w), token.trim())) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, account: string, issuer = 'World Direct Link'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${label}?${params.toString()}`;
}
