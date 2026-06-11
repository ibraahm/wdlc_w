import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_URL || 'http://localhost:4000/api';

export async function GET(req: NextRequest) {
  const context = req.nextUrl.searchParams.get('context') || 'default';

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[human-verification api] challenge request', { apiBase: API, context });
    }

    const res = await fetch(`${API}/human-verification/challenge?context=${encodeURIComponent(context)}`, {
      cache: 'no-store',
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[human-verification api] backend response was not JSON', {
          status: res.status,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.info('[human-verification api] backend response', { ok: res.ok, status: res.status });
    }

    if (!res.ok) {
      return NextResponse.json({ error: 'Verification question unavailable' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[human-verification api] backend request failed', {
        apiBase: API,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return NextResponse.json({ error: 'Verification question unavailable' }, { status: 503 });
  }
}
