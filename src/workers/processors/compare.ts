/**
 * Competitor Comparison Processor
 *
 * Runs audits against own + competitor URLs, computes per-dimension diff,
 * and optionally generates an AI improvement report.
 */

import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { settingsService } from "@/server/services/settingsService";
import { runComparison } from "@/server/compare/comparison";
import { createDeepSeekProvider } from "@/server/providers/ai/deepseek";

interface CompareJob {
  websiteId: string;
  competitorId: string;
  userId: string;
}

export async function processCompare(job: Job<CompareJob>) {
  const { websiteId, competitorId, userId } = job.data;

  // 1. Fetch site + competitor
  const sites = await db
    .select()
    .from(schema.websites)
    .where(eq(schema.websites.id, websiteId))
    .limit(1);
  if (!sites.length) throw new Error(`Site ${websiteId} not found`);
  const site = sites[0];

  const competitors = await db
    .select()
    .from(schema.competitors)
    .where(eq(schema.competitors.id, competitorId))
    .limit(1);
  if (!competitors.length) throw new Error(`Competitor ${competitorId} not found`);
  const competitor = competitors[0];

  // 2. Get latest SERP data (simplified — use most recent snapshots)
  const mySnapshots = await db
    .select()
    .from(schema.rankSnapshots)
    .innerJoin(schema.keywords, eq(schema.rankSnapshots.keywordId, schema.keywords.id))
    .where(eq(schema.keywords.websiteId, websiteId))
    .limit(1);

  const myPosition = mySnapshots[0]?.rank_snapshots?.position ?? null;
  const myAioCited = mySnapshots[0]?.rank_snapshots?.aiOverviewCited ?? false;

  // For competitor, we use SERP top-10 from the latest check
  const theirPosition = null; // Not tracked directly — use provided data
  const theirAioCited = false;

  // 3. Get PSI key
  const psiKey = (await settingsService.get(userId, "psi_api_key")) ?? "";

  // 4. Run comparison
  const result = await runComparison(
    site.primaryUrl,
    competitor.url,
    psiKey,
    myPosition,
    theirPosition,
    myAioCited,
    theirAioCited
  );

  // 5. Store comparison
  const comparison = await db
    .insert(schema.comparisons)
    .values({
      websiteId,
      competitorId,
      metrics: result.metrics as unknown as Record<string, unknown>,
    })
    .returning();

  // 6. Try AI report for actionable recommendations
  try {
    const provider = await createDeepSeekProvider(userId);
    const system = `You are an SEO competitive analyst for the Indonesian market.
Based on the comparison data, generate 3-5 specific, actionable steps the user should implement to beat the competitor.
Focus on the dimensions where the competitor is winning. Keep it concise.`;

    const user = `My site: ${site.primaryUrl}

Comparison results — ${result.dimensions.filter((d) => d.winner === "mine").length} dimensions I lead, ${result.dimensions.filter((d) => d.winner === "theirs").length} competitor leads, ${result.dimensions.filter((d) => d.winner === "tie").length} tied.

${result.dimensions.map((d) => `${d.winner === "mine" ? "✓" : d.winner === "theirs" ? "✗" : "="} ${d.name}: me ${d.mine}${d.unit} vs ${d.theirs}${d.unit} (delta: ${d.delta > 0 ? "+" : ""}${d.delta}${d.unit})`).join("\n")}

Overall: ${result.overallWinner === "mine" ? "I lead" : result.overallWinner === "theirs" ? "Competitor leads" : "Tied"}
My score: ${result.overallScore.mine} vs ${result.overallScore.theirs}`;

    const md = await provider.generateMarkdown({ system, user });

    const report = await db
      .insert(schema.aiReports)
      .values({
        kind: "comparison",
        model: "deepseek-v4-flash",
        content: md,
      })
      .returning();

    // Link report to comparison
    await db
      .update(schema.comparisons)
      .set({ aiReportId: report[0].id })
      .where(eq(schema.comparisons.id, comparison[0].id));

    console.log(`[compare] ✓ AI report generated for ${site.name} vs ${competitor.label || competitor.url}`);
  } catch (err) {
    console.warn(`[compare] AI report skipped: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[compare] ✓ ${site.name} vs ${competitor.label || competitor.url}: ${result.overallWinner} wins (${result.overallScore.mine}-${result.overallScore.theirs})`);

  return {
    overallWinner: result.overallWinner,
    myScore: result.overallScore.mine,
    theirScore: result.overallScore.theirs,
    dimensions: result.dimensions.length,
  };
}
