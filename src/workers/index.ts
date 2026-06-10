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

// ── Event Logging ──────────────────────────────────────────────────────────────

linkCheckWorker.on("completed", (job) => {
  console.log(`[linkcheck] ✓ ${job.name}`);
});

linkCheckWorker.on("failed", (job, err) => {
  console.error(`[linkcheck] ✗ ${job?.name ?? "unknown"}: ${err.message}`);
});

rankCheckWorker.on("completed", (job) => {
  console.log(`[rank] ✓ ${job.name}`);
});

rankCheckWorker.on("failed", (job, err) => {
  console.error(`[rank] ✗ ${job?.name ?? "unknown"}: ${err.message}`);
});

// ── Scheduler ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧 SEO-AI Worker starting…");

  // Set up cron-like schedules
  await setupSchedules();

  console.log("✅ SEO-AI Worker ready");
  console.log("   Queues: linkcheck, rank, gsc.sync");
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
  process.exit(0);
});
