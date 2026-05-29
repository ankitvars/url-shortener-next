import { createClient, type Client } from '@libsql/client';
import type { ClickBreakdown, StatsResponse } from './types';
import { generateSlug } from './slug';

declare global { var __db: Promise<Client> | undefined; }

function getDb(): Promise<Client> {
  if (!global.__db) {
    global.__db = (async () => {
      const db = createClient({
        url: process.env.TURSO_DATABASE_URL ?? 'file:shortener.db',
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      await db.batch([
        `CREATE TABLE IF NOT EXISTS links (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          slug         TEXT NOT NULL UNIQUE,
          original_url TEXT NOT NULL,
          created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )`,
        `CREATE TABLE IF NOT EXISTS clicks (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          link_id    INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
          clicked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
          referrer   TEXT,
          country    TEXT,
          browser    TEXT
        )`,
        'CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug)',
        'CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id)',
      ], 'write');
      return db;
    })();
  }
  return global.__db;
}

export interface LinkRow {
  id: number; slug: string; original_url: string; created_at: string;
}

function toLink(row: Record<string, unknown>): LinkRow {
  return {
    id: row.id as number,
    slug: row.slug as string,
    original_url: row.original_url as string,
    created_at: row.created_at as string,
  };
}

export async function createLink(originalUrl: string): Promise<LinkRow> {
  const db = await getDb();
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug(8);
    try {
      await db.execute({ sql: 'INSERT INTO links (slug, original_url) VALUES (?, ?)', args: [slug, originalUrl] });
      const res = await db.execute({ sql: 'SELECT * FROM links WHERE slug = ?', args: [slug] });
      return toLink(res.rows[0] as Record<string, unknown>);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) continue;
      throw e;
    }
  }
  throw new Error('Failed to generate unique slug');
}

export async function getLinkBySlug(slug: string): Promise<LinkRow | undefined> {
  const db = await getDb();
  const res = await db.execute({ sql: 'SELECT * FROM links WHERE slug = ?', args: [slug] });
  return res.rows[0] ? toLink(res.rows[0] as Record<string, unknown>) : undefined;
}

export async function recordClick(
  linkId: number,
  opts: { referrer?: string | null; country?: string | null; browser?: string | null },
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: 'INSERT INTO clicks (link_id, referrer, country, browser) VALUES (?, ?, ?, ?)',
    args: [linkId, opts.referrer ?? null, opts.country ?? null, opts.browser ?? null],
  });
}

export async function getStats(link: LinkRow): Promise<StatsResponse> {
  const db = await getDb();

  const [totalRes, countryRes, browserRes, referrerRes, dateRes] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) as n FROM clicks WHERE link_id = ?', args: [link.id] }),
    db.execute({ sql: 'SELECT country AS label, COUNT(*) AS count FROM clicks WHERE link_id = ? GROUP BY country ORDER BY count DESC LIMIT 10', args: [link.id] }),
    db.execute({ sql: 'SELECT browser AS label, COUNT(*) AS count FROM clicks WHERE link_id = ? GROUP BY browser ORDER BY count DESC LIMIT 10', args: [link.id] }),
    db.execute({ sql: 'SELECT referrer AS label, COUNT(*) AS count FROM clicks WHERE link_id = ? GROUP BY referrer ORDER BY count DESC LIMIT 10', args: [link.id] }),
    db.execute({ sql: "SELECT substr(clicked_at,1,10) AS label, COUNT(*) AS count FROM clicks WHERE link_id = ? GROUP BY label ORDER BY label ASC LIMIT 30", args: [link.id] }),
  ]);

  const toBreakdown = (rows: typeof totalRes.rows): ClickBreakdown[] =>
    rows.map(r => ({ label: (r.label as string | null) ?? 'unknown', count: r.count as number }));

  return {
    slug: link.slug,
    original_url: link.original_url,
    total_clicks: totalRes.rows[0].n as number,
    by_country: toBreakdown(countryRes.rows),
    by_browser: toBreakdown(browserRes.rows),
    by_referrer: toBreakdown(referrerRes.rows),
    clicks_over_time: toBreakdown(dateRes.rows),
  };
}
