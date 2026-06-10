/**
 * Cron-like job schedules.
 *
 * Workers run these schedules on boot via BullMQ repeatable jobs.
 * Each schedule sets up a repeatable job that fans out individual checks.
 */

import { Queue } from "bullmq";
import { connection } from "@/lib/queues";

export async function setupSchedules() {
  // ── Link Check Sweep (every 10 minutes) ─────────────────────────────────

  const linkSweepQueue = new Queue("linkcheck-schedule", { connection });

  // Remove old repeatable jobs to avoid duplicates
  const repeatables = await linkSweepQueue.getRepeatableJobs();
  for (const job of repeatables) {
    await linkSweepQueue.removeRepeatableByKey(job.key);
  }

  await linkSweepQueue.add(
    "sweep",
    { type: "linkcheck.sweep" },
    {
      repeat: {
        pattern: "*/10 * * * *", // every 10 minutes
      },
      removeOnComplete: 20,
      removeOnFail: 50,
    }
  );

  console.log("   Schedule: linkcheck.sweep — every 10 min");

  // ── Rank Daily Schedule (01:00 WIB = 18:00 UTC) ─────────────────────────

  const rankScheduleQueue = new Queue("rank-schedule", { connection });
  const rankRepeatables = await rankScheduleQueue.getRepeatableJobs();
  for (const job of rankRepeatables) {
    await rankScheduleQueue.removeRepeatableByKey(job.key);
  }

  await rankScheduleQueue.add(
    "daily",
    { type: "rank.schedule-daily" },
    {
      repeat: {
        pattern: "0 18 * * *", // 01:00 WIB
      },
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );

  console.log("   Schedule: rank.schedule-daily — 01:00 WIB");

  // ── GSC Sync (02:00 WIB = 19:00 UTC) ────────────────────────────────────

  const gscScheduleQueue = new Queue("gsc-schedule", { connection });
  const gscRepeatables = await gscScheduleQueue.getRepeatableJobs();
  for (const job of gscRepeatables) {
    await gscScheduleQueue.removeRepeatableByKey(job.key);
  }

  await gscScheduleQueue.add(
    "daily",
    { type: "gsc.sync" },
    {
      repeat: {
        pattern: "0 19 * * *", // 02:00 WIB
      },
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );

  console.log("   Schedule: gsc.sync — 02:00 WIB");

  // Close schedule-only queues
  await linkSweepQueue.close();
  await rankScheduleQueue.close();
  await gscScheduleQueue.close();
}
