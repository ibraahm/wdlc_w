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

  // Preserve the real client IP and browser user-agent across the proxy hop so
  // the backend records the signer's actual metadata (not the web server's
  // 127.0.0.1 / "node") on the e-signature.
  const ip = clientIp(req);
  const ua = req.headers.get('user-agent');

  try {
    const res = await fetch(`${API}/agents/apply`, {
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
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[agent-application api] backend response was not JSON', {
          status: res.status,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      console.info('[agent-application api] backend response', {
        ok: res.ok,
        status: res.status,
        error: data.error ?? data.message,
      });
    }
    if (!res.ok) {
      const message = Array.isArray(data.message) ? data.message.join('; ') : data.message || data.error || 'Submission failed';
      return NextResponse.json({ error: String(message) }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[agent-application api] backend request failed', {
        apiBase: API,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }
}
