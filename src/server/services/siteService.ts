import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";

export type SiteRow = typeof schema.websites.$inferSelect;
export type NewSite = typeof schema.websites.$inferInsert;

export const siteService = {
  async listByUser(userId: string): Promise<SiteRow[]> {
    return db
      .select()
      .from(schema.websites)
      .where(eq(schema.websites.userId, userId))
      .orderBy(schema.websites.createdAt);
  },

  async getById(siteId: string, userId: string): Promise<SiteRow | undefined> {
    const rows = await db
      .select()
      .from(schema.websites)
      .where(and(eq(schema.websites.id, siteId), eq(schema.websites.userId, userId)))
      .limit(1);
    return rows[0];
  },

  async create(userId: string, data: { name: string; primaryUrl: string; gscPropertyUrl?: string; locale?: string }): Promise<SiteRow> {
    const rows = await db
      .insert(schema.websites)
      .values({
        userId,
        name: data.name,
        primaryUrl: data.primaryUrl,
        gscPropertyUrl: data.gscPropertyUrl,
        locale: data.locale ?? "id",
      })
      .returning();
    return rows[0];
  },

  async update(siteId: string, userId: string, data: Partial<{ name: string; primaryUrl: string; gscPropertyUrl: string }>): Promise<SiteRow | undefined> {
    const rows = await db
      .update(schema.websites)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.websites.id, siteId), eq(schema.websites.userId, userId)))
      .returning();
    return rows[0];
  },

  async delete(siteId: string, userId: string): Promise<void> {
    await db
      .delete(schema.websites)
      .where(and(eq(schema.websites.id, siteId), eq(schema.websites.userId, userId)));
  },
};
