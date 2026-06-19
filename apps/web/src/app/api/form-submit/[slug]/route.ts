import { NextRequest, NextResponse } from 'next/server';
import { clientIp } from '@/lib/client-ip';

const API = process.env.API_URL || 'http://localhost:4000/api';

// Proxies public CMS form submissions (contact, claim, support, etc.) through
// the web server so the browser never has to reach the backend directly — the
// API binds to 127.0.0.1 and isn't publicly exposed. Forwards the real client
// IP for the submission record.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const ip = clientIp(req);
  const ua = req.headers.get('user-agent');

  try {
    const res = await fetch(`${API}/cms/forms/${encodeURIComponent(params.slug)}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ip ? { 'x-forwarded-for': ip, 'x-real-ip': ip } : {}),
        ...(ua ? { 'user-agent': ua } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON */ }
    if (!res.ok) {
      const message = Array.isArray(data.message) ? data.message.join('; ') : data.message || data.error || 'Submission failed';
      return NextResponse.json({ error: String(message), message: String(message) }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Service temporarily unavailable. Please try again later.' }, { status: 503 });
  }
}
