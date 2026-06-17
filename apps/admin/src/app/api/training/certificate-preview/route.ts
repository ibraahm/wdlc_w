import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const API = process.env.API_URL || 'http://localhost:4000/api';

// Proxies a certificate preview render (with the current, possibly unsaved
// template + layout) from the backend, attaching the admin's bearer token.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.text();
  const res = await fetch(`${API}/admin/training/certificate/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
    body,
  });
  if (!res.ok) {
    return NextResponse.json({ error: `Preview failed (${res.status})` }, { status: res.status });
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="certificate-preview.pdf"',
    },
  });
}
