/**
 * Cron-like job schedules with fan-out logic.
 *
 * Each schedule:
 *   1. Sets up a BullMQ repeatable job (cron)
 *   2. Creates a worker that picks up the cron job, queries the DB,
 *      and fans out individual jobs to the real processing queues.
 */

import { Worker, Queue } from "bullmq";
import { connection, linkCheckQueue, rankCheckQueue, gscSyncQueue } from "@/lib/queues";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function setupSchedules() {
  // ── Link Check Sweep (every 10 minutes) ─────────────────────────────────

  const linkSweepQueue = new Queue("linkcheck-schedule", { connection });

  const repeatables = await linkSweepQueue.getRepeatableJobs();
  for (const job of repeatables) {
    await linkSweepQueue.removeRepeatableByKey(job.key);
  }

  await linkSweepQueue.add(
    "sweep",
    { type: "linkcheck.sweep" },
    {
      repeat: { pattern: "*/10 * * * *" },
      removeOnComplete: 25,
      removeOnFail: 50,
    }
  );

  // Worker: fan-out link checks
  new Worker(
    "linkcheck-schedule",
    async () => {
      const links = await db
        .select({ id: schema.alternativeLinks.id })
        .from(schema.alternativeLinks);
      if (links.length > 0) {
        const jobs = links.map((l, i) => ({
          name: `link-check:${l.id}`,
          data: { alternativeLinkId: l.id },
          opts: { delay: i * 500, attempts: 2, removeOnComplete: 100, removeOnFail: 200 },
        }));
        await linkCheckQueue.addBulk(jobs);
        console.log(`[schedule] linkcheck.sweep → ${jobs.length} links enqueued`);
      }
    },
    { connection, concurrency: 1 }
  );

  console.log("   Schedule: linkcheck.sweep — every 10 min (fan-out to linkcheck queue)");

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
      repeat: { pattern: "0 18 * * *" },
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );

  // Worker: fan-out rank checks for all active keywords × 2 devices
  new Worker(
    "rank-schedule",
    async () => {
      const keywords = await db
        .select({
          id: schema.keywords.id,
          userId: schema.websites.userId,
        })
        .from(schema.keywords)
        .innerJoin(schema.websites, eq(schema.keywords.websiteId, schema.websites.id))
        .where(eq(schema.keywords.isActive, true));

      for (const kw of keywords) {
        // Stagger: mobile first, desktop 30s later
        await rankCheckQueue.add(
          `rank-check:${kw.id}:mobile`,
          { keywordId: kw.id, device: "mobile", userId: kw.userId },
          { delay: 0, attempts: 1, removeOnComplete: 200, removeOnFail: 200 }
        );
        await rankCheckQueue.add(
          `rank-check:${kw.id}:desktop`,
          { keywordId: kw.id, device: "desktop", userId: kw.userId },
          { delay: 30_000, attempts: 1, removeOnComplete: 200, removeOnFail: 200 }
        );
      }
      console.log(`[schedule] rank.schedule-daily → ${keywords.length * 2} rank checks enqueued`);
    },
    { connection, concurrency: 1 }
  );

  console.log("   Schedule: rank.schedule-daily — 01:00 WIB (fan-out to rank queue)");

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
      repeat: { pattern: "0 19 * * *" },
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );

  // Worker: fan-out GSC syncs for all sites with GSC properties
  new Worker(
    "gsc-schedule",
    async () => {
      const sites = await db
        .select({
          id: schema.websites.id,
          userId: schema.websites.userId,
          gscPropertyUrl: schema.websites.gscPropertyUrl,
        })
        .from(schema.websites);

      const withGsc = sites.filter((s) => s.gscPropertyUrl);
      for (const site of withGsc) {
        await gscSyncQueue.add(
          `gsc-sync:${site.id}`,
          {
            websiteId: site.id,
            gscPropertyUrl: site.gscPropertyUrl!,
            userId: site.userId,
          },
          { attempts: 2, removeOnComplete: 30, removeOnFail: 50 }
        );
      }
      console.log(`[schedule] gsc.sync → ${withGsc.length} sites enqueued`);
    },
    { connection, concurrency: 1 }
  );

  console.log("   Schedule: gsc.sync — 02:00 WIB (fan-out to gsc.sync queue)");
}
