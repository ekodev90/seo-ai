import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { siteService } from "@/server/services/siteService";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const site = await siteService.getById(siteId, session.user.id);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const competitors = await db
    .select()
    .from(schema.competitors)
    .where(eq(schema.competitors.websiteId, siteId));

  return NextResponse.json(competitors);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { websiteId, url, label } = body;
  if (!websiteId || !url) return NextResponse.json({ error: "websiteId and url required" }, { status: 400 });

  const site = await siteService.getById(websiteId, session.user.id);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const competitor = await db
    .insert(schema.competitors)
    .values({ websiteId, url, label: label ?? null })
    .returning();

  return NextResponse.json(competitor[0], { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(schema.competitors).where(eq(schema.competitors.id, id));
  return NextResponse.json({ success: true });
}
