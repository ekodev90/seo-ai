import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jobLogService } from "@/server/services/jobLogService";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const runs = await jobLogService.recent(50);
    return NextResponse.json(runs);
  } catch (err) {
    console.error("Failed to list job runs:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
