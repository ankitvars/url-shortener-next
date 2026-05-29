'use client';

import { useState, useRef } from 'react';
import type { LinkResponse, StatsResponse, ClickBreakdown } from '@/lib/types';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs tracking-widest uppercase text-muted mb-3">
      {children}
    </p>
  );
}

function BarChart({ data, label }: { data: ClickBreakdown[]; label: string }) {
  if (!data.length) {
    return (
      <div>
        <SectionLabel>{label}</SectionLabel>
        <p className="font-mono text-xs text-muted">no data yet</p>
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted w-24 shrink-0 truncate text-right">
              {item.label}
            </span>
            <div className="flex-1 h-4 bg-surface rounded-sm overflow-hidden border border-border">
              <div
                className="bar-fill h-full bg-lime rounded-sm"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs text-muted w-6 text-right shrink-0">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsPanel({ stats }: { stats: StatsResponse }) {
  return (
    <div className="fade-up space-y-8 border border-border rounded-lg p-6">
      <div>
        <SectionLabel>total clicks</SectionLabel>
        <p className="font-display text-7xl text-lime leading-none">{stats.total_clicks}</p>
        <p className="font-mono text-xs text-muted mt-2 truncate">{stats.original_url}</p>
      </div>
      <BarChart data={stats.clicks_over_time} label="clicks over time" />
      <BarChart data={stats.by_country} label="by country" />
      <BarChart data={stats.by_browser} label="by browser" />
      <BarChart data={stats.by_referrer} label="by referrer" />
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<LinkResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  async function shorten() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStats(null);
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error: string }).error ?? 'Something went wrong');
        return;
      }
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
      const res = await fetch(`/api/links/${slug}/stats`);
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error: string }).error ?? 'Failed to load stats');
        return;
      }
      setStats(data as StatsResponse);
      setTimeout(() => statsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      setError('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-bg text-text px-4 py-16 sm:py-24">
      <div className="max-w-xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <h1 className="font-display text-6xl sm:text-7xl text-lime mb-2 leading-none">
            SNIP
          </h1>
          <p className="font-mono text-xs text-muted tracking-wider">
            cut long URLs down to size · track every click
          </p>
        </div>

        {/* Shorten form */}
        <div className="space-y-3">
          <SectionLabel>paste your url</SectionLabel>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && shorten()}
              placeholder="https://example.com/very/long/url"
              className="flex-1 bg-surface border border-border rounded-md px-4 py-3 font-mono text-sm text-text placeholder:text-muted focus:outline-none focus:border-lime transition-colors"
            />
            <button
              onClick={shorten}
              disabled={loading || !url.trim()}
              className="bg-lime text-bg font-mono text-sm font-bold px-5 py-3 rounded-md hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? '...' : 'SHORTEN →'}
            </button>
          </div>
          {error && (
            <p className="font-mono text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="fade-up space-y-4 border border-border rounded-lg p-5">
            <div>
              <SectionLabel>your short link</SectionLabel>
              <div className="flex items-center gap-3">
                <a
                  href={result.short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-lime text-sm hover:underline break-all"
                >
                  {result.short_url}
                </a>
                <button
                  onClick={() => copy(result.short_url)}
                  className="shrink-0 font-mono text-xs border border-border px-3 py-1.5 rounded hover:border-lime hover:text-lime transition-colors"
                >
                  {copied ? 'COPIED ✓' : 'COPY'}
                </button>
              </div>
              <p className="font-mono text-xs text-muted mt-1 truncate">{result.original_url}</p>
            </div>
            <button
              onClick={() => viewStats(result.slug)}
              disabled={statsLoading}
              className="w-full border border-border hover:border-lime text-muted hover:text-lime font-mono text-xs py-2.5 rounded transition-colors disabled:opacity-40"
            >
              {statsLoading ? 'LOADING...' : 'VIEW ANALYTICS FOR THIS LINK →'}
            </button>
          </div>
        )}

        {/* Stats */}
        <div ref={statsRef}>
          {stats && <StatsPanel stats={stats} />}
        </div>

      </div>
    </main>
  );
}
