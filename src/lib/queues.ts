import { Queue } from "bullmq";
import { env } from "@/lib/env";

export const connection = {
  url: env.REDIS_URL,
};

// ── Queue Definitions ─────────────────────────────────────────────────────────

export const linkCheckQueue = new Queue("linkcheck", { connection });
export const rankCheckQueue = new Queue("rank", { connection });
export const gscSyncQueue = new Queue("gsc.sync", { connection });
export const psiAuditQueue = new Queue("psi.audit", { connection });
export const auditQueue = new Queue("audit", { connection });
export const compareQueue = new Queue("compare", { connection });
export const aiReportQueue = new Queue("ai.report", { connection });

// ── Convenience: fan-out helpers ──────────────────────────────────────────────

export async function enqueueLinkChecks(linkIds: string[], delayMs = 0) {
  const jobs = linkIds.map((linkId, i) => ({
    name: `link-check:${linkId}`,
    data: { alternativeLinkId: linkId },
    opts: { delay: delayMs + i * 500, attempts: 2, removeOnComplete: 100, removeOnFail: 200 },
  }));
  return linkCheckQueue.addBulk(jobs);
}

export async function enqueueRankCheck(keywordId: string, device: "mobile" | "desktop", delayMs: number) {
  return rankCheckQueue.add(
    `rank-check:${keywordId}:${device}`,
    { keywordId, device },
    { delay: delayMs, attempts: 1, removeOnComplete: 200, removeOnFail: 200 }
  );
}
