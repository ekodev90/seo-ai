/**
 * Rank Check Processor
 *
 * Checks Google rank for a single keyword on a specific device,
 * stores the snapshot, and detects AI Overview presence/citations.
 */

import type { Job } from "bullmq";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getRankProvider } from "@/server/providers/rank";

interface RankCheckJob {
  keywordId: string;
  device: "mobile" | "desktop";
  userId: string;
}

export async function processRankCheck(job: Job<RankCheckJob>) {
  const { keywordId, device, userId } = job.data;

  // 1. Load keyword with site context
  const keywordRows = await db
    .select({
      id: schema.keywords.id,
      phrase: schema.keywords.phrase,
      websiteId: schema.keywords.websiteId,
      websiteName: schema.websites.name,
      primaryUrl: schema.websites.primaryUrl,
    })
    .from(schema.keywords)
    .innerJoin(schema.websites, eq(schema.keywords.websiteId, schema.websites.id))
    .where(eq(schema.keywords.id, keywordId))
    .limit(1);

  if (!keywordRows.length) {
    throw new Error(`Keyword ${keywordId} not found`);
  }

  const kw = keywordRows[0];

  // 2. Get rank provider for user
  let provider;
  try {
    provider = await getRankProvider(userId);
  } catch (err) {
    console.warn(`[rank] No provider available for user ${userId}, skipping`);
    return { skipped: true, reason: "no_provider" };
  }

  // 3. Extract target domain from primary URL
  const targetDomains: string[] = [];
  try {
    const hostname = new URL(kw.primaryUrl).hostname;
    targetDomains.push(hostname, hostname.replace("www.", ""));
  } catch {
    targetDomains.push(kw.primaryUrl);
  }

  // 4. Check rank
  const result = await provider.check({
    keyword: kw.phrase,
    device,
    gl: "id",
    hl: "id",
    targetDomains,
  });

  // 5. Store snapshot
  const today = new Date().toISOString().split("T")[0];

  await db
    .insert(schema.rankSnapshots)
    .values({
      keywordId,
      capturedAt: today,
      device,
      position: result.position,
      foundUrl: result.foundUrl,
      serpFeatures: [],
      aiOverviewPresent: result.aiOverview?.present ?? null,
      aiOverviewCited: result.aiOverview?.cited ?? null,
      aiOverviewSources: result.aiOverview?.sources ?? null,
      provider: provider.name as "scrape" | "serper",
    })
    .onConflictDoUpdate({
      target: [schema.rankSnapshots.keywordId, schema.rankSnapshots.capturedAt, schema.rankSnapshots.device, schema.rankSnapshots.provider],
      set: {
        position: sql`EXCLUDED.position`,
        foundUrl: sql`EXCLUDED.found_url`,
        serpFeatures: sql`EXCLUDED.serp_features`,
        aiOverviewPresent: sql`EXCLUDED.ai_overview_present`,
        aiOverviewCited: sql`EXCLUDED.ai_overview_cited`,
        aiOverviewSources: sql`EXCLUDED.ai_overview_sources`,
      },
    });

  return {
    keyword: kw.phrase,
    device,
    position: result.position,
    aiOverview: result.aiOverview?.present ?? false,
    aiCited: result.aiOverview?.cited ?? false,
  };
}

// Need sql for onConflictDoUpdate
import { sql } from "drizzle-orm";
