import { NextRequest, NextResponse } from 'next/server';

// Simple in-process rate limiter: max 20 requests per IP per minute.
const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Allow only printable ASCII characters that make sense in an address query.
const SAFE_Q = /^[\w\s,.\-#/()&'àáâäãåèéêëìíîïòóôöõøùúûüýÿñçæœ]+$/i;

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 3 || q.length > 200 || !SAFE_Q.test(q)) {
    return NextResponse.json([]);
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycodes', 'us,ca');
  url.searchParams.set('q', q);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'WorldDirectLink-AgentPortal/1.0 (agent-application form)',
        'Accept-Language': 'en',
      },
      // Cache identical lookups briefly to ease load and speed up repeats.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
