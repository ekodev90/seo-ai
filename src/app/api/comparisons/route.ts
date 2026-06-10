import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { siteService } from "@/server/services/siteService";
import { compareQueue } from "@/lib/queues";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { websiteId, competitorId } = body;
    if (!websiteId || !competitorId) return NextResponse.json({ error: "websiteId and competitorId required" }, { status: 400 });

    const site = await siteService.getById(websiteId, session.user.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    // Enqueue comparison job
    const job = await compareQueue.add("compare", {
      websiteId,
      competitorId,
      userId: session.user.id,
    });

    return NextResponse.json({ jobId: job.id, message: "Comparison queued" }, { status: 202 });
  } catch (err) {
    console.error("Failed to queue comparison:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const site = await siteService.getById(siteId, session.user.id);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const comparisons = await db
    .select()
    .from(schema.comparisons)
    .where(eq(schema.comparisons.websiteId, siteId))
    .orderBy(schema.comparisons.createdAt);

  return NextResponse.json(comparisons);
}
