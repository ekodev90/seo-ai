import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { auditId } = await params;

  try {
    const audit = await db
      .select()
      .from(schema.audits)
      .where(eq(schema.audits.id, auditId))
      .limit(1);

    if (!audit.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const findings = await db
      .select()
      .from(schema.auditFindings)
      .where(eq(schema.auditFindings.auditId, auditId))
      .orderBy(schema.auditFindings.severity);

    return NextResponse.json({ ...audit[0], findings });
  } catch (err) {
    console.error("Failed to get audit details:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
