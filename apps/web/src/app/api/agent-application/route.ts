import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_URL || 'http://localhost:4000/api';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Preserve the real client IP across the proxy hop so the backend records the
  // signer's actual IP (not the web server's 127.0.0.1) on the e-signature.
  // Order: Cloudflare true-client headers, then standard proxy headers.
  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('true-client-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.ip ||
    '';

  try {
    const res = await fetch(`${API}/agents/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clientIp ? { 'x-forwarded-for': clientIp, 'x-real-ip': clientIp } : {}),
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
