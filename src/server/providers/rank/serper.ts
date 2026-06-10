/**
 * Serper.dev Rank Provider
 *
 * Uses Serper.dev API (~$1/1k queries) for fast, reliable Google SERP data.
 * Detects AI Overviews from SERP feature snippets.
 *
 * https://serper.dev/docs
 */

import type { RankProvider, RankCheckQuery, RankResult } from "./types";

interface SerperOrganicResult {
  position: number;
  title: string;
  link: string;
  snippet?: string;
}

interface SerperAiOverviewItem {
  title: string;
  link: string;
  snippet?: string;
}

interface SerperResponse {
  searchParameters: { q: string; gl: string; hl: string; device: string };
  organic?: SerperOrganicResult[];
  aiOverview?: SerperAiOverviewItem[];
}

export class SerperProvider implements RankProvider {
  name = "serper" as const;
  maxConcurrency = 5;
  minDelayMs = 0;

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async check(query: RankCheckQuery): Promise<RankResult> {
    const { keyword, device, gl, hl, targetDomains } = query;

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: keyword,
        gl: gl,
        hl: hl,
        num: 100,
        device: device,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as SerperResponse;

    // Find position of target domains in organic results
    const organic = data.organic ?? [];
    let position: number | null = null;
    let foundUrl: string | null = null;

    for (const result of organic) {
      const resultDomain = extractHostname(result.link);
      if (targetDomains.some((d) => resultDomain.includes(d))) {
        position = result.position;
        foundUrl = result.link;
        break;
      }
    }

    // Top 10 for competitor diff
    const topResults = organic.slice(0, 10).map((r) => ({
      position: r.position,
      url: r.link,
      title: r.title,
    }));

    // AI Overview detection
    const aiOverviewItems = data.aiOverview ?? [];
    const cited = aiOverviewItems.some((item) => {
      const itemDomain = extractHostname(item.link);
      return targetDomains.some((d) => itemDomain.includes(d));
    });

    return {
      position,
      foundUrl,
      topResults,
      aiOverview: {
        present: aiOverviewItems.length > 0,
        cited,
        sources: aiOverviewItems.map((item) => item.link),
      },
    };
  }
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
