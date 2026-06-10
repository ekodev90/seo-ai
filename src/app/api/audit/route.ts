import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { runAudit } from "@/server/audit/engine";
import { ALL_RULES } from "@/server/audit/rules";
import { siteService } from "@/server/services/siteService";
import { psiAuditQueue } from "@/lib/queues";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { websiteId, targetUrl } = body;

    if (!websiteId || !targetUrl) {
      return NextResponse.json({ error: "websiteId and targetUrl required" }, { status: 400 });
    }

    const site = await siteService.getById(websiteId, session.user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const audit = await db
      .insert(schema.audits)
      .values({
        websiteId,
        targetUrl,
        kind: "onpage",
        status: "running",
        startedAt: new Date(),
      })
      .returning();

    const auditId = audit[0].id;

    const result = await runAudit(targetUrl, ALL_RULES);

    for (const finding of result.findings) {
      await db.insert(schema.auditFindings).values({
        auditId,
        ruleId: finding.ruleId,
        category: finding.category,
        severity: finding.severity,
        message: finding.message,
        details: (finding.details ?? {}) as Record<string, unknown>,
        recommendation: finding.recommendation ?? null,
      });
    }

    await db
      .update(schema.audits)
      .set({
        status: "completed",
        score: result.score,
        summary: result.summary,
        completedAt: new Date(),
      })
      .where(eq(schema.audits.id, auditId));

    await psiAuditQueue.add("psi-audit", {
      websiteId,
      targetUrl,
      userId: session.user.id,
      auditId,
    });

    return NextResponse.json({
      auditId,
      score: result.score,
      summary: result.summary,
      findingsCount: result.findings.length,
    });
  } catch (err) {
    console.error("Audit failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit failed" },
      { status: 500 }
    );
  }
}

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
    const site = await siteService.getById(siteId, session.user.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const audits = await db
      .select()
      .from(schema.audits)
      .where(eq(schema.audits.websiteId, siteId))
      .orderBy(schema.audits.createdAt);

    return NextResponse.json(audits);
  } catch (err) {
    console.error("Failed to list audits:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
