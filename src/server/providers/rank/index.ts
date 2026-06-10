/**
 * Rank provider factory.
 *
 * Returns the configured RankProvider based on user settings
 * (scrape = Playwright, serper = Serper.dev API).
 */

import type { RankProvider } from "./types";
import { SerperProvider } from "./serper";
import { PlaywrightSerpProvider } from "./playwright-serp";
import { settingsService } from "@/server/services/settingsService";

export type { RankProvider, RankResult, RankCheckQuery } from "./types";

export async function getRankProvider(userId: string): Promise<RankProvider> {
  const preferredProvider = await settingsService.get(userId, "rank_provider");

  // Try Serper first if API key is configured
  const serperKey = await settingsService.get(userId, "serper_api_key");
  if (serperKey && (preferredProvider === "serper" || !preferredProvider)) {
    return new SerperProvider(serperKey);
  }

  // Try Playwright scrape (works in Docker worker)
  if (preferredProvider === "scrape" || !serperKey) {
    try {
      const proxyUrl = (await settingsService.get(userId, "proxy_url")) ?? undefined;
      return new PlaywrightSerpProvider(proxyUrl);
    } catch {
      // Playwright not available
    }
  }

  throw new Error(
    "No rank provider available. Configure a Serper API key in Settings, or run the Docker worker for Playwright-based scraping."
  );
}
