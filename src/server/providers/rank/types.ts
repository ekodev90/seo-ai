/**
 * RankProvider adapter interface.
 *
 * Pluggable architecture: swap between Playwright scraping (free, slow, risky)
 * and Serper.dev API (paid, fast, reliable) via a single adapter.
 */

export interface RankResult {
  /** 1-based position (null = not in top 100) */
  position: number | null;
  /** URL that ranks at this position */
  foundUrl: string | null;
  /** Top-10 organic results for competitor diff */
  topResults: { position: number; url: string; title: string }[];
  /** AI Overview detection */
  aiOverview: {
    present: boolean;
    cited: boolean;
    sources: string[];
  } | null;
}

export interface RankCheckQuery {
  keyword: string;
  device: "mobile" | "desktop";
  gl: string; // geolocation, e.g. "id"
  hl: string; // interface language, e.g. "id"
  /** Primary domains to look for in results */
  targetDomains: string[];
}

export interface RankProvider {
  name: "scrape" | "serper";
  check(query: RankCheckQuery): Promise<RankResult>;
  maxConcurrency: number;
  minDelayMs: number;
}
