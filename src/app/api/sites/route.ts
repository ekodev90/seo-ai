import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { siteService } from "@/server/services/siteService";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, primaryUrl, gscPropertyUrl } = body;

    if (!name || !primaryUrl) {
      return NextResponse.json({ error: "Name and primaryUrl are required" }, { status: 400 });
    }

    const site = await siteService.create(session.user.id, {
      name,
      primaryUrl,
      gscPropertyUrl,
    });

    return NextResponse.json(site, { status: 201 });
  } catch (err) {
    console.error("Failed to create site:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sites = await siteService.listByUser(session.user.id);
    return NextResponse.json(sites);
  } catch (err) {
    console.error("Failed to list sites:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
