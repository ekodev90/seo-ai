/**
 * Playwright SERP Scrape Provider
 *
 * Free-tier Google rank checking via Playwright + stealth techniques.
 * Detects AI Overviews from rendered page content.
 *
 * ⚠️  Requires Playwright (only available in Docker worker container).
 *    Google SearchGuard (Jan 2025) requires JS rendering.
 *    Limit: <50 queries/day/IP. Use proxy rotation for scale.
 *
 * This module loads Playwright dynamically — if not installed, the
 * factory falls back to Serper (if configured).
 */

import type { RankProvider, RankCheckQuery, RankResult } from "./types";

let pwModule: typeof import("playwright") | null = null;

async function getPlaywright() {
  if (!pwModule) {
    pwModule = await import("playwright");
  }
  return pwModule;
}

export class PlaywrightSerpProvider implements RankProvider {
  name = "scrape" as const;
  maxConcurrency = 1;
  minDelayMs = 120_000; // 2 minutes between queries

  private proxyUrl?: string;

  constructor(proxyUrl?: string) {
    this.proxyUrl = proxyUrl;
  }

  async check(query: RankCheckQuery): Promise<RankResult> {
    const { keyword, device, gl, hl, targetDomains } = query;
    const pw = await getPlaywright();

    const browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
      viewport: { width: 412, height: 915 },
      locale: "id-ID",
      proxy: this.proxyUrl ? { server: this.proxyUrl } : undefined,
    });

    const page = await context.newPage();

    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=${gl}&hl=${hl}`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });

      await page.waitForSelector("h3", { timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(3_000);

      // Extract organic results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topResults: { position: number; url: string; title: string }[] = [];
      let position: number | null = null;
      let foundUrl: string | null = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const organicLinks = await (page as any).$$("a h3");

      for (let i = 0; i < Math.min(organicLinks.length, 100); i++) {
        const link = organicLinks[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const title = ((await (link as any).textContent())?.trim() ?? "") as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anchor = await (link as any).evaluateHandle((el: Element) => el.closest("a"));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const href = (await (anchor as any).evaluate((el: Element) => (el as HTMLAnchorElement).href)) as string;

        const pos = i + 1;
        if (pos <= 10) {
          topResults.push({ position: pos, url: href, title });
        }

        if (position === null) {
          try {
            const hostname = new URL(href).hostname;
            if (targetDomains.some((d) => hostname.includes(d))) {
              position = pos;
              foundUrl = href;
            }
          } catch {
            // skip
          }
        }
      }

      // AI Overview detection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aiOverviewPresent = await (page as any).evaluate(() => {
        const all = document.querySelectorAll("h1, h2, span");
        for (const el of all) {
          if (el.textContent?.includes?.("AI Overview") || el.textContent?.includes?.("Gambaran AI")) {
            return true;
          }
        }
        return false;
      }) as boolean;

      const aiSources: string[] = [];
      let aiOverviewCited = false;

      if (aiOverviewPresent) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aioLinks = await (page as any).$$("#search a[href]");
        for (const a of aioLinks.slice(0, 20)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const href = await (a as any).evaluate((el: Element) => (el as HTMLAnchorElement).href) as string;
          if (href && !href.includes("google.com")) {
            aiSources.push(href);
            try {
              const hostname = new URL(href).hostname;
              if (targetDomains.some((d) => hostname.includes(d))) {
                aiOverviewCited = true;
              }
            } catch {
              // skip
            }
          }
        }
      }

      return {
        position,
        foundUrl,
        topResults,
        aiOverview: {
          present: aiOverviewPresent,
          cited: aiOverviewCited,
          sources: aiSources,
        },
      };
    } finally {
      await browser.close();
    }
  }
}
