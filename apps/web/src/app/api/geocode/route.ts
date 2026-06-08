import { NextRequest, NextResponse } from 'next/server';

// Proxies address lookups to OpenStreetMap Nominatim with a compliant
// User-Agent header (required by their usage policy) and sensible defaults.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 3) {
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
