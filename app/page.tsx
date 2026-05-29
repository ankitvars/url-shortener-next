'use client';

import { useState, useRef } from 'react';
import type { LinkResponse, StatsResponse, ClickBreakdown } from '@/lib/types';

/* ─────────────────────────── sub-components ──────────────────────────── */

function SectionDivider({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] text-muted tabular-nums shrink-0">{n}</span>
      <div className="h-px flex-1 bg-border" />
      <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-muted-2 shrink-0">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function BarRow({
  label, count, max, delay,
}: {
  label: string; count: number; max: number; delay: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div
      className="grid items-center gap-x-3"
      style={{ gridTemplateColumns: '5.5rem 1fr 2.5rem' }}
    >
      <span className="font-mono text-[11px] text-muted-2 text-right truncate leading-none">
        {label}
      </span>
      <div className="h-[2px] bg-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-lime rounded-full bar-fill"
          style={{ width: `${pct}%`, animationDelay: `${delay}ms` }}
        />
      </div>
      <span className="font-mono text-[11px] text-muted tabular-nums text-right">
        {count}
      </span>
    </div>
  );
}

function Chart({ data, label }: { data: ClickBreakdown[]; label: string }) {
  const max = data.length ? Math.max(...data.map((d) => d.count)) : 1;
  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-2">{label}</p>
      {data.length === 0 ? (
        <p className="font-mono text-[11px] text-muted pl-0.5">— no data yet</p>
      ) : (
        <div className="space-y-[10px]">
          {data.map((item, i) => (
            <BarRow
              key={i}
              label={item.label}
              count={item.count}
              max={max}
              delay={i * 55}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatsPanel({ stats }: { stats: StatsResponse }) {
  return (
    <div className="fade-up space-y-10">

      {/* ── Big number ── */}
      <div className="flex items-end justify-between gap-6 pb-8 border-b border-border">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-2 mb-2">
            total clicks
          </p>
          <p className="font-display text-[5rem] sm:text-[6.5rem] leading-[0.88] text-lime font-black tracking-tight">
            {stats.total_clicks.toLocaleString()}
          </p>
        </div>
        <p className="font-mono text-[10px] text-muted max-w-[38%] text-right break-all pb-1 leading-[1.7]">
          {stats.original_url}
        </p>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <Chart data={stats.clicks_over_time} label="over time" />
        <Chart data={stats.by_country}       label="by country" />
        <Chart data={stats.by_browser}       label="by browser" />
        <Chart data={stats.by_referrer}      label="by referrer" />
      </div>
    </div>
  );
}

/* ─────────────────────────── main component ──────────────────────────── */

export default function Home() {
  const [url,          setUrl]          = useState('');
  const [result,       setResult]       = useState<LinkResponse | null>(null);
  const [stats,        setStats]        = useState<StatsResponse | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [copied,       setCopied]       = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  async function shorten() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStats(null);
    try {
      const res  = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError((data as { error: string }).error ?? 'Something went wrong'); return; }
      setResult(data as LinkResponse);
    } catch {
      setError('Network error — is the server running?');
    } finally {
      setLoading(false);
    }
  }

  async function viewStats(slug: string) {
    setStatsLoading(true);
    setStats(null);
    setError(null);
    try {
      const res  = await fetch(`/api/links/${slug}/stats`);
      const data = await res.json();
      if (!res.ok) { setError((data as { error: string }).error ?? 'Failed to load stats'); return; }
      setStats(data as StatsResponse);
      setTimeout(() => statsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch {
      setError('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* silent */ }
  }

  return (
    <div className="relative min-h-screen bg-bg text-text">

      {/* Fixed lime accent stripe */}
      <div className="fixed top-0 inset-x-0 h-[2px] bg-lime z-50" aria-hidden="true" />

      {/* Film grain */}
      <div className="grain" aria-hidden="true" />

      <main className="relative max-w-[680px] mx-auto px-5 sm:px-8 pt-20 pb-28 space-y-12">

        {/* ── Header ── */}
        <header>
          <div className="flex items-end justify-between pb-5 border-b border-border">
            <h1 className="font-display text-[3.25rem] sm:text-[4rem] font-black tracking-tight leading-none">
              SNIP<span className="text-lime">.</span>
            </h1>
            <p className="font-mono text-[10px] text-muted pb-1">2026</p>
          </div>
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-2 mt-3.5">
            url shortener · click analytics · zero external deps
          </p>
        </header>

        {/* ── 01 / SHORTEN ── */}
        <section className="space-y-6">
          <SectionDivider n="01" label="shorten" />

          <div className="space-y-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && shorten()}
              placeholder="https://your-very-long-url.com/paste/it/here"
              autoComplete="off"
              spellCheck={false}
              className="url-input w-full bg-surface border border-border rounded-sm px-5 py-4 font-mono text-sm text-text placeholder:text-muted focus:outline-none"
            />

            {error && (
              <p className="font-mono text-[11px] text-red-400/75 fade-in pl-1">{error}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={shorten}
                disabled={loading || !url.trim()}
                className="group font-mono text-[11px] tracking-[0.22em] uppercase bg-lime text-bg px-7 py-[11px] hover:bg-white transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span>working…</span>
                ) : (
                  <>
                    <span>Shorten</span>
                    <span className="ml-1.5 inline-block transition-transform duration-150 group-hover:translate-x-[3px]">
                      →
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ── Result card ── */}
        {result && (
          <div className="fade-up bg-surface border border-border-hi rounded-sm overflow-hidden">

            {/* Short URL */}
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
              <div className="min-w-0 space-y-2">
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-2">
                  short link
                </p>
                <a
                  href={result.short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display text-[1.8rem] leading-tight text-lime hover:underline decoration-lime/25 underline-offset-[5px] break-all block"
                >
                  {result.short_url.replace(/^https?:\/\//, '')}
                </a>
                <p className="font-mono text-[11px] text-muted truncate">
                  {result.original_url}
                </p>
              </div>

              <button
                onClick={() => copy(result.short_url)}
                aria-label={copied ? 'Copied!' : 'Copy short URL'}
                className={[
                  'shrink-0 mt-[1.875rem] font-mono text-[10px] tracking-[0.16em] uppercase',
                  'border px-4 py-2 rounded-sm transition-all duration-200',
                  copied
                    ? 'border-lime/60 text-lime bg-lime/5'
                    : 'border-border text-muted-2 hover:border-border-hi hover:text-text',
                ].join(' ')}
              >
                {copied ? '✓ copied' : 'copy'}
              </button>
            </div>

            {/* Analytics trigger */}
            <div className="border-t border-border px-5 py-3.5">
              <button
                onClick={() => viewStats(result.slug)}
                disabled={statsLoading}
                className="group/va font-mono text-[10px] tracking-[0.16em] uppercase text-muted hover:text-lime transition-colors duration-150 disabled:opacity-40 flex items-center gap-2.5"
              >
                <span className="inline-block h-px bg-current w-3 transition-[width] duration-200 group-hover/va:w-5" />
                {statsLoading ? 'loading…' : 'View analytics'}
                <span className="inline-block h-px bg-current w-3 transition-[width] duration-200 group-hover/va:w-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── 02 / ANALYTICS ── */}
        {stats && (
          <section ref={statsRef} className="space-y-8 scroll-mt-8">
            <SectionDivider n="02" label="analytics" />
            <StatsPanel stats={stats} />
          </section>
        )}

      </main>
    </div>
  );
}
