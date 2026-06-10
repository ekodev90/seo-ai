import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { enqueueLinkChecks } from "@/lib/queues";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all alternative links for the user's sites
    const sites = await db
      .select({ id: schema.websites.id })
      .from(schema.websites)
      .where(eq(schema.websites.userId, session.user.id));

    const siteIds = sites.map((s) => s.id);
    if (!siteIds.length) {
      return NextResponse.json({ message: "No sites found" });
    }

    // Fetch all links for these sites
    const allLinks: string[] = [];
    for (const siteId of siteIds) {
      const links = await db
        .select({ id: schema.alternativeLinks.id })
        .from(schema.alternativeLinks)
        .where(eq(schema.alternativeLinks.websiteId, siteId));
      allLinks.push(...links.map((l) => l.id));
    }

    if (!allLinks.length) {
      return NextResponse.json({ message: "No links to check" });
    }

    await enqueueLinkChecks(allLinks, 200);
    return NextResponse.json({ message: `Enqueued ${allLinks.length} link checks` });
  } catch (err) {
    console.error("Failed to trigger sweep:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
