import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { siteService } from "@/server/services/siteService";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";

export async function GET(
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
    const site = await siteService.getById(siteId, session.user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Also fetch alternative links
    const links = await db
      .select()
      .from(schema.alternativeLinks)
      .where(eq(schema.alternativeLinks.websiteId, siteId));

    return NextResponse.json({ ...site, links });
  } catch (err) {
    console.error("Failed to get site:", err);
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

  try {
    await siteService.delete(siteId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete site:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
