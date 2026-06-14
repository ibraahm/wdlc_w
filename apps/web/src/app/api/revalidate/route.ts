import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

const SECRET = process.env.REVALIDATE_SECRET;

export async function POST(req: NextRequest) {
  if (!SECRET) {
    // Missing in production is a misconfiguration; in dev log a warning but allow if no secret set.
    if (process.env.NODE_ENV === 'production') {
      console.error('REVALIDATE_SECRET env var is not set - revalidation endpoint is disabled');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
  }

  // Accept token only via header (not query param - query params leak to access logs)
  const token = req.headers.get('x-revalidate-token');
  if (SECRET && token !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path, tag } = await req.json().catch(() => ({})) as { path?: string; tag?: string };

  if (tag) {
    revalidateTag(tag);
    return NextResponse.json({ revalidated: true, tag });
  }

  if (path) {
    revalidatePath(path);
    return NextResponse.json({ revalidated: true, path });
  }

  revalidatePath('/', 'layout');
  return NextResponse.json({ revalidated: true, scope: 'all' });
}
