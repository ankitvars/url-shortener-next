import { NextRequest, NextResponse } from 'next/server';
import { getLinkBySlug, getStats } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = getLinkBySlug(slug);
  if (!link) return NextResponse.json({ error: 'Slug not found' }, { status: 404 });
  try {
    return NextResponse.json(getStats(link));
  } catch (err) {
    console.error('[GET stats]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}