import type { NextRequest } from 'next/server';

/**
 * Derive the real client IP at the web-app proxy boundary, trusting only
 * headers our own edge sets — NOT arbitrary headers a remote client can spoof.
 *
 * Threat model: the browser talks to nginx, which proxies to this Next.js app.
 * A client can send any header it likes (cf-connecting-ip, true-client-ip,
 * x-real-ip, a forged x-forwarded-for prefix). The only values we can trust are
 * the ones nginx overwrites with the real TCP peer:
 *   proxy_set_header X-Real-IP        $remote_addr;
 *   proxy_set_header X-Forwarded-For  $proxy_add_x_forwarded_for;  # appends $remote_addr
 *
 * So we prefer X-Real-IP, and for X-Forwarded-For we take the LAST hop (the IP
 * nginx appended) rather than the spoofable left-most entry.
 *
 * Cloudflare's cf-connecting-ip / true-client-ip are only meaningful when the
 * app actually sits behind Cloudflare; otherwise they are attacker-controlled.
 * They are therefore ignored unless TRUST_CF_HEADERS=true is set explicitly.
 */
export function clientIp(req: NextRequest): string {
  if (process.env.TRUST_CF_HEADERS === 'true') {
    const cf = req.headers.get('cf-connecting-ip') || req.headers.get('true-client-ip');
    if (cf) return cf.trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const hops = xff.split(',').map((h) => h.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }

  return req.ip || '';
}
