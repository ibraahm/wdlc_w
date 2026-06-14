import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.API_URL || 'http://localhost:4000/api';

// Streams the completion-certificate PDF from the backend, attaching the
// agent's access token from the httpOnly cookie (a plain <a> link can't send
// the bearer header itself).
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const token = cookies().get('pat')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', _req.url));

  const res = await fetch(`${API}/portal/training/courses/${encodeURIComponent(params.slug)}/certificate`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return new NextResponse('Certificate not available', { status: res.status });
  }

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${params.slug}.pdf"`,
    },
  });
}
