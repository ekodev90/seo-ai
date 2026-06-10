import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export const jobLogService = {
  async started(jobName: string, metadata?: Record<string, unknown>) {
    const rows = await db
      .insert(schema.jobRuns)
      .values({
        jobName,
        status: "started",
        metadata: metadata ?? {},
      })
      .returning();
    return rows[0];
  },

  async completed(runId: string, message?: string) {
    await db
      .update(schema.jobRuns)
      .set({
        status: "completed",
        message: message ?? null,
        completedAt: new Date(),
      })
      .where(eq(schema.jobRuns.id, runId));
  },

  async failed(runId: string, error: string) {
    await db
      .update(schema.jobRuns)
      .set({
        status: "failed",
        message: error,
        completedAt: new Date(),
      })
      .where(eq(schema.jobRuns.id, runId));
  },

  async recent(limit = 20) {
    return db
      .select()
      .from(schema.jobRuns)
      .orderBy(schema.jobRuns.startedAt)
      .limit(limit);
  },
};
