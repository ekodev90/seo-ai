/**
 * Worker entry point.
 *
 * Run separately from the Next.js server:
 *   npx tsx src/workers/index.ts
 */

import { Worker } from "bullmq";
import { connection } from "@/lib/queues";
import { processLinkCheck } from "./processors/link-check";
import { processRankCheck } from "./processors/rank-check";
import { processGscSync } from "./processors/gsc-sync";
import { processPsiAudit } from "./processors/psi-audit";
import { processCompare } from "./processors/compare";
import { setupSchedules } from "./schedule";

// ── Workers ────────────────────────────────────────────────────────────────────

const linkCheckWorker = new Worker("linkcheck", processLinkCheck, {
  connection,
  concurrency: 20,
  limiter: {
    max: 20,
    duration: 10_000, // max 20 jobs per 10 seconds
  },
});

const rankCheckWorker = new Worker(
  "rank",
  processRankCheck,
  { connection, concurrency: 1, limiter: { max: 1, duration: 120_000 } }
);

const gscSyncWorker = new Worker(
  "gsc.sync",
  processGscSync,
  { connection, concurrency: 1 }
);

const psiAuditWorker = new Worker(
  "psi.audit",
  processPsiAudit,
  { connection, concurrency: 2 }
);

const compareWorker = new Worker(
  "compare",
  processCompare,
  { connection, concurrency: 2 }
);

// ── Event Logging + Job Runs ──────────────────────────────────────────────────

async function logJobRun(jobName: string, status: string, message?: string) {
  try {
    const { db, schema } = await import("@/db");
    await db.insert(schema.jobRuns).values({
      jobName,
      status,
      message: message ?? null,
      startedAt: new Date(),
      completedAt: status !== "started" ? new Date() : null,
    });
  } catch {
    // Don't let logging failure crash the worker
  }
}

linkCheckWorker.on("completed", (job) => {
  console.log(`[linkcheck] ✓ ${job.name}`);
  logJobRun(`linkcheck:${job.name}`, "completed");
});

linkCheckWorker.on("failed", (job, err) => {
  console.error(`[linkcheck] ✗ ${job?.name ?? "unknown"}: ${err.message}`);
  logJobRun(`linkcheck:${job?.name ?? "unknown"}`, "failed", err.message);
});

rankCheckWorker.on("completed", (job) => {
  console.log(`[rank] ✓ ${job.name}`);
  logJobRun(`rank:${job.name}`, "completed");
});

rankCheckWorker.on("failed", (job, err) => {
  console.error(`[rank] ✗ ${job?.name ?? "unknown"}: ${err.message}`);
  logJobRun(`rank:${job?.name ?? "unknown"}`, "failed", err.message);
});

// ── Scheduler ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧 SEO-AI Worker starting…");

  // Set up cron-like schedules
  await setupSchedules();

  console.log("✅ SEO-AI Worker ready");
  console.log("   Queues: linkcheck, rank, gsc.sync, psi.audit, compare");
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down…");
  await linkCheckWorker.close();
  await rankCheckWorker.close();
  await gscSyncWorker.close();
  await psiAuditWorker.close();
  await compareWorker.close();
  process.exit(0);
});
