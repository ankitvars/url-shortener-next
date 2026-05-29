import { NextRequest, NextResponse } from 'next/server';
import { createLink } from '@/lib/db';
import type { LinkResponse } from '@/lib/types';

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const raw = (body as Record<string, unknown>)?.original_url;
  if (typeof raw !== 'string' || !raw.trim())
    return NextResponse.json({ error: 'original_url is required' }, { status: 422 });

  const originalUrl = raw.trim();
  try {
    const parsed = new URL(originalUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: 'Must be a valid http(s) URL' }, { status: 422 });
  }

  const link = await createLink(originalUrl);
  const base = new URL(req.url).origin;
  const response: LinkResponse = {
    slug: link.slug,
    original_url: link.original_url,
    created_at: link.created_at,
    short_url: `${base}/${link.slug}`,
  };
  return NextResponse.json(response, { status: 201 });
}
