import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = await params;

  try {
    // Verify site ownership
    const { siteService } = await import("@/server/services/siteService");
    const site = await siteService.getById(siteId, session.user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const body = await request.json();
    const { url, label } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const link = await db
      .insert(schema.alternativeLinks)
      .values({
        websiteId: siteId,
        url,
        label: label || null,
        currentStatus: "unknown",
      })
      .returning();

    return NextResponse.json(link[0], { status: 201 });
  } catch (err) {
    console.error("Failed to add alternative link:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = await params;
  const url = new URL(request.url);
  const linkId = url.searchParams.get("linkId");

  if (!linkId) {
    return NextResponse.json({ error: "linkId query parameter required" }, { status: 400 });
  }

  try {
    await db
      .delete(schema.alternativeLinks)
      .where(
        and(
          eq(schema.alternativeLinks.id, linkId),
          eq(schema.alternativeLinks.websiteId, siteId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete alternative link:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
