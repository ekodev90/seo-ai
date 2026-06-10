/**
 * Rank provider factory.
 *
 * Returns the configured RankProvider based on user settings
 * (scrape = Playwright, serper = Serper.dev API).
 */

import type { RankProvider } from "./types";
import { SerperProvider } from "./serper";
import { settingsService } from "@/server/services/settingsService";

export type { RankProvider, RankResult, RankCheckQuery } from "./types";

/**
 * Get the rank provider for a user. Reads the user's `rank_provider` setting.
 *
 * Priority:
 *   1. Serper if API key is configured
 *   2. Falls back to scrape (Playwright) — implemented in Phase 2
 */
export async function getRankProvider(userId: string): Promise<RankProvider> {
  const preferredProvider = await settingsService.get(userId, "rank_provider");

  // Try Serper first
  const serperKey = await settingsService.get(userId, "serper_api_key");
  if (serperKey && (preferredProvider === "serper" || !preferredProvider)) {
    return new SerperProvider(serperKey);
  }

  // TODO: Playwright scrape provider (Phase 2 later)
  throw new Error(
    "No rank provider available. Configure a Serper API key in Settings, or use the scrape provider."
  );
}
