import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiResource } from '@/lib/api';

// Streams a resource's file through the portal's own origin so it renders in the
// in-page viewer. External hosts like Dropbox refuse to be embedded in an
// iframe (X-Frame-Options / CSP), but our server can fetch the bytes and serve
// them same-origin, where no framing restriction applies.
function directUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('dropbox.com')) {
      // Force the raw file bytes rather than the (un-embeddable) preview page.
      u.searchParams.delete('dl');
      u.searchParams.set('dl', '1');
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('pat')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Resolve + audience-check the resource on the backend (throws if not allowed).
  let resource;
  try {
    resource = await apiResource(token, params.id);
  } catch {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(directUrl(resource.url), {
      redirect: 'follow',
      headers: { 'User-Agent': 'WDLC-Portal' },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Could not load the document' }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Could not load the document (${upstream.status})` }, { status: 502 });
  }

  // Prefer the upstream content type; fall back to PDF for .pdf links that come
  // back as a generic stream.
  let contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  if (/\.pdf(\?|$)/i.test(resource.url) && !contentType.includes('pdf')) contentType = 'application/pdf';

  const download = req.nextUrl.searchParams.get('download') === '1' && resource.allowDownload;
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Disposition': download ? 'attachment' : 'inline',
    'Cache-Control': 'private, no-store',
  };
  const len = upstream.headers.get('content-length');
  if (len) headers['Content-Length'] = len;

  return new NextResponse(upstream.body, { status: 200, headers });
}
