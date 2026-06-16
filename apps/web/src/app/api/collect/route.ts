import { NextRequest, NextResponse } from 'next/server';

// Same-origin sink for the page-view beacon. Runs server-side so it can read the
// edge/CDN geo headers and the real client IP, then forwards a compact event to
// the backend analytics collector (authenticated by a shared ingest key). The
// browser never talks to the backend directly and no secret is exposed.
const API = process.env.API_URL || 'http://localhost:4000/api';
const PORTAL = 'web';

// Edge geo headers we forward verbatim so the backend can resolve country.
const GEO_HEADERS = [
  'cf-ipcountry',
  'cf-region',
  'cf-ipcity',
  'x-vercel-ip-country',
  'x-vercel-ip-country-region',
  'x-vercel-ip-city',
  'x-geo-country',
  'x-geo-region',
  'x-geo-city',
  'x-country-code',
];

export async function POST(req: NextRequest) {
  let payload: { path?: unknown; referrer?: unknown } = {};
  try {
    payload = await req.json();
  } catch {
    /* sendBeacon may deliver an empty body */
  }
  const path = typeof payload.path === 'string' ? payload.path : '/';
  const referrer = typeof payload.referrer === 'string' ? payload.referrer : undefined;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = process.env.ANALYTICS_INGEST_KEY;
  if (key) headers['x-analytics-key'] = key;
  for (const name of GEO_HEADERS) {
    const v = req.headers.get(name);
    if (v) headers[name] = v;
  }
  const ua = req.headers.get('user-agent');
  if (ua) headers['user-agent'] = ua;
  // Trust only what our own edge sets: X-Real-IP, or the last (appended) XFF hop.
  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
  if (ip) headers['x-visitor-ip'] = ip;

  try {
    await fetch(`${API}/analytics/collect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ portal: PORTAL, path, referrer }),
    });
  } catch {
    /* never surface analytics failures to the visitor */
  }
  return new NextResponse(null, { status: 204 });
}
