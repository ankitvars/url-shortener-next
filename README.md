# SNIP — URL Shortener

A minimal URL shortener with per-link click analytics. Zero external services — everything stored in a local SQLite database.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Build

```bash
npm run build
npm start
```

The SQLite database (`shortener.db`) is created automatically at startup in the project root. Use a volume mount in containerised deployments.

## API Reference

### `POST /api/links`

Create a short link.

**Request body:**
```json
{ "original_url": "https://example.com" }
```

**Response `201`:**
```json
{
  "slug": "aBcDeFgH",
  "original_url": "https://example.com",
  "created_at": "2026-05-29T10:00:00Z",
  "short_url": "http://localhost:3000/aBcDeFgH"
}
```

### `GET /{slug}`

Redirects to the original URL (307) and records a click.

### `GET /api/links/{slug}/stats`

Returns click analytics for a link.

```json
{
  "slug": "aBcDeFgH",
  "original_url": "https://example.com",
  "total_clicks": 42,
  "by_country":       [{ "label": "US", "count": 20 }],
  "by_browser":       [{ "label": "Chrome", "count": 30 }],
  "by_referrer":      [{ "label": "https://twitter.com", "count": 10 }],
  "clicks_over_time": [{ "label": "2026-05-29", "count": 5 }]
}
```

## Project Layout

```
app/
  [slug]/route.ts            # Redirect + click recording
  api/links/route.ts         # POST — create short link
  api/links/[slug]/stats/    # GET  — click analytics
  page.tsx                   # Frontend UI
lib/
  db.ts                      # SQLite singleton + CRUD
  slug.ts                    # Slug generator (Web Crypto, zero deps)
  types.ts                   # Shared TypeScript interfaces
shortener.db                 # SQLite database (auto-created, gitignored)
```

## Notes

- **Country detection** requires Cloudflare (`cf-ipcountry`) or Vercel (`x-vercel-ip-country`) headers — always `null` in local dev.
- The database is gitignored (`*.db`). Back it up separately in production.
- Slug collisions are retried up to 5× — at 8 chars over a 62-char alphabet the probability per attempt is negligible.
