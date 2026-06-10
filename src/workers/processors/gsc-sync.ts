/**
 * GSC Sync Processor
 *
 * Fetches yesterday's Google Search Console data for each site
 * that has a GSC property configured, upserts into gscDaily,
 * and auto-imports top queries as keywords.
 */

import type { Job } from "bullmq";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { settingsService } from "@/server/services/settingsService";
import { fetchSearchAnalytics, parseGscRows } from "@/server/providers/gsc";

interface GscSyncJob {
  websiteId: string;
  gscPropertyUrl: string;
  userId: string;
  date?: string; // YYYY-MM-DD, defaults to yesterday
}

export async function processGscSync(job: Job<GscSyncJob>) {
  const { websiteId, gscPropertyUrl, userId } = job.data;

  // Get yesterday's date
  const yesterday = job.data.date ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  // 1. Load service account credentials from settings
  const saJson = await settingsService.get(userId, "gsc_service_account_json");
  if (!saJson) {
    throw new Error(`GSC service account not configured for user ${userId}`);
  }

  const credentials = JSON.parse(saJson) as unknown as Parameters<typeof fetchSearchAnalytics>[0];

  // 2. Fetch search analytics for yesterday
  console.log(`[gsc.sync] Fetching data for ${gscPropertyUrl} on ${yesterday}`);
  const rows = await fetchSearchAnalytics(credentials as Parameters<typeof fetchSearchAnalytics>[0], {
    siteUrl: gscPropertyUrl,
    startDate: yesterday,
    endDate: yesterday,
    dimensions: ["query", "page", "device"],
    rowLimit: 25000,
    dataState: "all",
  });

  const parsed = parseGscRows(rows, ["query", "page", "device"]);
  console.log(`[gsc.sync] Got ${parsed.length} rows for ${gscPropertyUrl}`);

  if (!parsed.length) return { imported: 0, keywords: 0 };

  // 3. Upsert into gscDaily
  for (const row of parsed) {
    await db
      .insert(schema.gscDaily)
      .values({
        websiteId,
        date: yesterday,
        query: row.query,
        page: row.page,
        device: row.device,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })
      .onConflictDoUpdate({
        target: [schema.gscDaily.websiteId, schema.gscDaily.date, schema.gscDaily.query, schema.gscDaily.page, schema.gscDaily.device],
        set: {
          clicks: sql`EXCLUDED.clicks`,
          impressions: sql`EXCLUDED.impressions`,
          ctr: sql`EXCLUDED.ctr`,
          position: sql`EXCLUDED.position`,
        },
      });
  }

  // 4. Auto-import top queries as keywords (top 50 by impressions, not already tracked)
  const topQueries = parsed
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 50)
    .map((r) => r.query)
    .filter((q, i, arr) => arr.indexOf(q) === i); // dedup

  let keywordsImported = 0;
  for (const phrase of topQueries) {
    try {
      await db
        .insert(schema.keywords)
        .values({
          websiteId,
          phrase,
          source: "gsc",
          isActive: true,
        })
        .onConflictDoNothing();
      keywordsImported++;
    } catch {
      // Skip duplicates
    }
  }

  console.log(`[gsc.sync] ✓ ${gscPropertyUrl}: ${parsed.length} rows, ${keywordsImported} new keywords`);

  return { imported: parsed.length, keywords: keywordsImported };
}
