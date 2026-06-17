import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const API = process.env.API_URL || 'http://localhost:4000/api';

// Proxies a per-course certificate preview (saved template + the course's real
// title/category) from the backend, attaching the admin's bearer token.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const res = await fetch(`${API}/admin/training/certificate/course/${encodeURIComponent(params.id)}/preview`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
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
