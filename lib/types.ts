export interface LinkResponse {
  slug: string;
  original_url: string;
  created_at: string;
  short_url: string;
}

export interface ClickBreakdown {
  label: string;
  count: number;
}

export interface StatsResponse {
  slug: string;
  original_url: string;
  total_clicks: number;
  by_country: ClickBreakdown[];
  by_browser: ClickBreakdown[];
  by_referrer: ClickBreakdown[];
  clicks_over_time: ClickBreakdown[];
}