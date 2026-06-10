/**
 * Link Check Processor
 *
 * Probes an alternative link URL via HTTP GET, classifies the result,
 * and stores the outcome. Follows redirects to detect block pages.
 *
 * Volume control: writes linkChecks rows only on status change,
 * error, or 1 daily heartbeat per link.
 */

import type { Job } from "bullmq";
import { db, schema } from "@/db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { classifyProbe, type LinkStatus } from "@/server/linkcheck/classifier";

interface LinkCheckJob {
  alternativeLinkId: string;
}

export async function processLinkCheck(job: Job<LinkCheckJob>) {
  const { alternativeLinkId } = job.data;

  // 1. Fetch the alternative link record
  const links = await db
    .select()
    .from(schema.alternativeLinks)
    .where(eq(schema.alternativeLinks.id, alternativeLinkId))
    .limit(1);

  if (!links.length) {
    throw new Error(`Alternative link ${alternativeLinkId} not found`);
  }

  const link = links[0];

  // 2. HTTP probe
  const startTime = Date.now();
  let httpStatus: number | null = null;
  let error: string | undefined;
  let body = "";
  let finalUrl = link.url;
  let finalHost = "";

  try {
    const response = await fetch(link.url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id,en;q=0.9",
      },
      signal: AbortSignal.timeout(15_000),
    });

    httpStatus = response.status;
    finalUrl = response.url;

    // Extract host from final URL
    try {
      finalHost = new URL(finalUrl).hostname;
    } catch {
      finalHost = "";
    }

    // Read body for signature matching (limit to 200KB)
    body = await response.text().then((t) => t.slice(0, 200_000));
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const latencyMs = Date.now() - startTime;

  // 3. Extract title from body
  const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // 4. Classify
  const result = classifyProbe({
    httpStatus,
    error,
    body,
    title,
    finalHost,
    latencyMs,
    finalUrl,
  });

  // 5. Check if this is a status change
  const previousStatus = link.currentStatus;
  const statusChanged = result.status !== previousStatus;

  // 6. Check last heartbeat (1 per day)
  const lastCheck = await db
    .select({ checkedAt: schema.linkChecks.checkedAt })
    .from(schema.linkChecks)
    .where(eq(schema.linkChecks.alternativeLinkId, alternativeLinkId))
    .orderBy(desc(schema.linkChecks.checkedAt))
    .limit(1);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const needsHeartbeat =
    !lastCheck.length || lastCheck[0].checkedAt < oneDayAgo;

  // 7. Write linkChecks row only on status change, error, or daily heartbeat
  if (statusChanged || result.status !== "active" || needsHeartbeat) {
    await db.insert(schema.linkChecks).values({
      alternativeLinkId,
      status: result.status,
      httpStatus: result.httpStatus,
      latencyMs: result.latencyMs,
      finalUrl: result.finalUrl,
      evidence: result.evidence,
      isHeartbeat: needsHeartbeat && !statusChanged && result.status === "active",
    });
  }

  // 8. Update denormalized status on alternativeLinks
  if (statusChanged) {
    await db
      .update(schema.alternativeLinks)
      .set({
        currentStatus: result.status,
        lastCheckedAt: new Date(),
        lastStatusChangeAt: new Date(),
      })
      .where(eq(schema.alternativeLinks.id, alternativeLinkId));
  } else {
    await db
      .update(schema.alternativeLinks)
      .set({ lastCheckedAt: new Date() })
      .where(eq(schema.alternativeLinks.id, alternativeLinkId));
  }

  return {
    linkId: alternativeLinkId,
    status: result.status,
    previousStatus,
    statusChanged,
    latencyMs,
  };
}
