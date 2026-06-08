import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

const SECRET = process.env.REVALIDATE_SECRET || 'wdlc-revalidate-dev';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || req.headers.get('x-revalidate-token');

  if (token !== SECRET) {
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

  // Revalidate all CMS pages
  revalidatePath('/', 'layout');
  return NextResponse.json({ revalidated: true, scope: 'all' });
}
