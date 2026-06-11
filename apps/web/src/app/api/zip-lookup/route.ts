import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const ipHits = new Map<string, { count: number; resetAt: number }>();
const ZIP_PATTERN = /^\d{5}$/;

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

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const zip = req.nextUrl.searchParams.get('zip')?.trim() ?? '';
  if (!ZIP_PATTERN.test(zip)) {
    return NextResponse.json({ error: 'Enter a valid 5-digit U.S. ZIP code' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'ZIP not found' }, { status: 404 });
    }

    const data = await res.json();
    const place = Array.isArray(data.places) ? data.places[0] : null;
    const city = typeof place?.['place name'] === 'string' ? place['place name'] : '';
    const state = typeof place?.state === 'string' ? place.state : '';
    if (!city || !state) {
      return NextResponse.json({ error: 'ZIP not found' }, { status: 404 });
    }

    return NextResponse.json({ zip, city, state });
  } catch {
    return NextResponse.json({ error: 'ZIP lookup unavailable' }, { status: 503 });
  }
}
