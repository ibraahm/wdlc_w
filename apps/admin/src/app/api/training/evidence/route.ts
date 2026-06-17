import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const API = process.env.API_URL || 'http://localhost:4000/api';

// Proxies the authenticated evidence export from the backend so the browser
// can download it without exposing the bearer token in the page.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const format = sp.get('format') === 'csv' ? 'csv' : 'pdf';
  const pass = new URLSearchParams();
  for (const k of ['courseId', 'branchCode', 'state', 'from', 'to', 'passedOnly']) {
    const v = sp.get(k);
    if (v) pass.set(k, v);
  }

  const res = await fetch(`${API}/admin/training/evidence.${format}?${pass.toString()}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (!res.ok) {
    return NextResponse.json({ error: `Export failed (${res.status})` }, { status: res.status });
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': res.headers.get('content-disposition') ?? `attachment; filename="evidence.${format}"`,
    },
  });
}
