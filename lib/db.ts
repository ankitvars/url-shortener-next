import Database from 'better-sqlite3';
import path from 'path';
import type { ClickBreakdown, StatsResponse } from './types';
import { generateSlug } from './slug';

const DB_PATH = path.join(process.cwd(), 'shortener.db');

declare global { var __db: Database.Database | undefined; }

function getDb(): Database.Database {
  if (!global.__db) {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE IF NOT EXISTS links (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        slug         TEXT NOT NULL UNIQUE,
        original_url TEXT NOT NULL,
        created_at   TEXT NOT NULL
                       DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );
      CREATE TABLE IF NOT EXISTS clicks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        link_id    INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        clicked_at TEXT NOT NULL
                     DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        referrer   TEXT,
        country    TEXT,
        browser    TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_links_slug     ON links(slug);
      CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
    `);
    global.__db = db;
  }
  return global.__db;
}

export interface LinkRow {
  id: number; slug: string; original_url: string; created_at: string;
}

export function createLink(originalUrl: string): LinkRow {
  const db = getDb();
  const insert = db.prepare<{ slug: string; original_url: string }>(
    `INSERT INTO links (slug, original_url) VALUES (@slug, @original_url)`
  );
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug(8);
    try {
      insert.run({ slug, original_url: originalUrl });
      return db.prepare<{ slug: string }>('SELECT * FROM links WHERE slug = @slug')
        .get({ slug }) as LinkRow;
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) continue;
      throw e;
    }
  }
  throw new Error('Failed to generate unique slug');
}

export function getLinkBySlug(slug: string): LinkRow | undefined {
  return getDb()
    .prepare<{ slug: string }>('SELECT * FROM links WHERE slug = @slug')
    .get({ slug }) as LinkRow | undefined;
}

export function recordClick(
  linkId: number,
  opts: { referrer?: string | null; country?: string | null; browser?: string | null },
): void {
  getDb()
    .prepare<{ link_id: number; referrer: string | null; country: string | null; browser: string | null }>(
      `INSERT INTO clicks (link_id, referrer, country, browser)
       VALUES (@link_id, @referrer, @country, @browser)`
    )
    .run({
      link_id: linkId, referrer: opts.referrer ?? null,
      country: opts.country ?? null, browser: opts.browser ?? null
    });
}

function topN(rows: Array<{ label: string | null; count: number }>, n = 10): ClickBreakdown[] {
  return rows.slice(0, n).map((r) => ({ label: r.label ?? 'unknown', count: r.count }));
}

export function getStats(link: LinkRow): StatsResponse {
  const db = getDb();
  const { n: total } = db
    .prepare<{ link_id: number }>('SELECT COUNT(*) as n FROM clicks WHERE link_id = @link_id')
    .get({ link_id: link.id }) as { n: number };

  const q = (col: string) =>
    db.prepare<{ link_id: number }>(
      `SELECT ${col} AS label, COUNT(*) AS count FROM clicks
       WHERE link_id = @link_id GROUP BY ${col} ORDER BY count DESC`
    ).all({ link_id: link.id }) as Array<{ label: string | null; count: number }>;

  const byDate = db.prepare<{ link_id: number }>(
    `SELECT substr(clicked_at,1,10) AS label, COUNT(*) AS count
     FROM clicks WHERE link_id = @link_id GROUP BY label ORDER BY label ASC LIMIT 30`
  ).all({ link_id: link.id }) as Array<{ label: string; count: number }>;

  return {
    slug: link.slug, original_url: link.original_url, total_clicks: total,
    by_country: topN(q('country')), by_browser: topN(q('browser')),
    by_referrer: topN(q('referrer')), clicks_over_time: byDate,
  };
}