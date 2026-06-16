import { NextRequest, NextResponse } from 'next/server';
import { clientIp } from '@/lib/client-ip';

const API = process.env.API_URL || 'http://localhost:4000/api';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  // Forward the real client IP across the proxy hop for the e-signature record.
  const ip = clientIp(req);
  try {
    const res = await fetch(`${API}/agents/tellers/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ip ? { 'x-forwarded-for': ip, 'x-real-ip': ip } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON */ }
    if (!res.ok) {
      const message = Array.isArray(data.message) ? data.message.join('; ') : data.message;
      return NextResponse.json({ error: message || 'Submission failed' }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }
}
