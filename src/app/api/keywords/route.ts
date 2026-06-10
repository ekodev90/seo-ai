import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");

  if (!siteId) {
    return NextResponse.json({ error: "siteId required" }, { status: 400 });
  }

  try {
    // Verify ownership
    const { siteService } = await import("@/server/services/siteService");
    const site = await siteService.getById(siteId, session.user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const keywords = await db
      .select()
      .from(schema.keywords)
      .where(eq(schema.keywords.websiteId, siteId))
      .orderBy(schema.keywords.createdAt);

    return NextResponse.json(keywords);
  } catch (err) {
    console.error("Failed to list keywords:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { websiteId, phrase } = body;

    if (!websiteId || !phrase) {
      return NextResponse.json({ error: "websiteId and phrase required" }, { status: 400 });
    }

    // Verify ownership
    const { siteService } = await import("@/server/services/siteService");
    const site = await siteService.getById(websiteId, session.user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const keyword = await db
      .insert(schema.keywords)
      .values({
        websiteId,
        phrase: phrase.trim(),
        source: "manual",
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [schema.keywords.websiteId, schema.keywords.phrase],
        set: { isActive: true },
      })
      .returning();

    return NextResponse.json(keyword[0], { status: 201 });
  } catch (err) {
    console.error("Failed to create keyword:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const keywordId = url.searchParams.get("id");

  if (!keywordId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    // Verify ownership through site
    const keyword = await db
      .select({ websiteId: schema.keywords.websiteId })
      .from(schema.keywords)
      .where(eq(schema.keywords.id, keywordId))
      .limit(1);

    if (!keyword.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { siteService } = await import("@/server/services/siteService");
    const site = await siteService.getById(keyword[0].websiteId, session.user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Soft-delete: deactivate
    await db
      .update(schema.keywords)
      .set({ isActive: false })
      .where(eq(schema.keywords.id, keywordId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete keyword:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
