/**
 * Rank provider factory.
 *
 * Returns the configured RankProvider based on user settings
 * (scrape = Playwright, serper = Serper.dev API).
 */

import type { RankProvider } from "./types";

export type { RankProvider, RankResult, RankCheckQuery } from "./types";

/**
 * Get the rank provider for a user. Reads user's `rank_provider` setting.
 * Falls back to serper if available, otherwise scrape.
 */
export async function getRankProvider(
  userId: string,
  _settingsService: unknown // injected settingsService
): Promise<RankProvider> {
  // TODO: Implement in Phase 2 — read user's rank_provider setting,
  // instantiate the appropriate provider, and return it.
  throw new Error("Rank provider not yet implemented (Phase 2)");
}
