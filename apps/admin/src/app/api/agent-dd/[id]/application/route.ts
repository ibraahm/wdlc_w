import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const API = process.env.API_URL || 'http://localhost:4000/api';

// Streams the agent's one-page application PDF from the backend with the
// admin's bearer token attached.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const res = await fetch(`${API}/admin/agent-dd/${encodeURIComponent(params.id)}/application.pdf`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    return NextResponse.json({ error: `Export failed (${res.status})` }, { status: res.status });
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': res.headers.get('content-disposition') ?? `attachment; filename="application-${params.id}.pdf"`,
    },
  });
}
