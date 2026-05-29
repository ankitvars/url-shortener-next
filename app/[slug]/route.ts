import { NextRequest, NextResponse } from 'next/server';
import { getLinkBySlug, recordClick } from '@/lib/db';

// Next.js 15+: params is a Promise — must be awaited
interface Params { params: Promise<{ slug: string }>; }

function parseBrowser(ua: string): string | null {
  if (!ua) return null;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  if (ua.includes('Chrome/') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  return null;
}

function getCountry(req: NextRequest): string | null {
  // req.geo was removed in Next.js 15 — use CDN headers instead
  return (
    req.headers.get('cf-ipcountry') ||       // Cloudflare
    req.headers.get('x-vercel-ip-country') || // Vercel
    null
  );
}

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params; // await required in Next.js 15+

  const link = await getLinkBySlug(slug);
  if (!link) return new NextResponse('Not found', { status: 404 });

  try {
    await recordClick(link.id, {
      referrer: req.headers.get('referer') ?? null,
      country: getCountry(req),
      browser: parseBrowser(req.headers.get('user-agent') ?? ''),
    });
  } catch (err) {
    console.error('[click record]', err); // non-fatal
  }

  return NextResponse.redirect(link.original_url, { status: 307 });
}