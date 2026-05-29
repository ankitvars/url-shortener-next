import { NextRequest, NextResponse } from 'next/server';
import { getLinkBySlug, getStats } from '@/lib/db';

interface Params { params: { slug: string }; }

export async function GET(_req: NextRequest, { params }: Params) {
  const link = getLinkBySlug(params.slug);
  if (!link) return NextResponse.json({ error: 'Slug not found' }, { status: 404 });
  try {
    return NextResponse.json(getStats(link));
  } catch (err) {
    console.error('[GET stats]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}