import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { siteService } from "@/server/services/siteService";
import { createDeepSeekProvider } from "@/server/providers/ai/deepseek";
import { aiReports } from "@/db/schema";

const TaskSchema = z.object({
  priority: z.enum(["high", "medium", "low"]),
  effort: z.enum(["small", "medium", "large"]),
  ruleIds: z.array(z.string()),
  action: z.string(),
});

const ImprovementPlanSchema = z.object({
  overview: z.string(),
  tasks: z.array(TaskSchema),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { auditId, websiteId } = body;

    if (!auditId || !websiteId) {
      return NextResponse.json({ error: "auditId and websiteId required" }, { status: 400 });
    }

    // Verify ownership
    const site = await siteService.getById(websiteId, session.user.id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    // Fetch audit + findings
    const audit = await db
      .select()
      .from(schema.audits)
      .where(eq(schema.audits.id, auditId))
      .limit(1);

    if (!audit.length) return NextResponse.json({ error: "Audit not found" }, { status: 404 });

    const findings = await db
      .select()
      .from(schema.auditFindings)
      .where(eq(schema.auditFindings.auditId, auditId));

    // Get non-pass findings
    const issues = findings.filter((f) => f.severity !== "pass");

    // Try to generate AI report
    let report: { overview: string; tasks: z.infer<typeof TaskSchema>[] } | null = null;

    try {
      const provider = await createDeepSeekProvider(session.user.id);

      const system = `You are an expert SEO auditor for the Indonesian market.
Analyze the audit findings and create a prioritized improvement plan.
For each task, assign: priority (high/medium/low), effort (small/medium/large), ruleIds (related finding ruleIds), action (specific clear instruction in Indonesian).
Focus first on critical issues that impact Google mobile ranking.`;

      const user = `Site: ${site.primaryUrl}
Score: ${audit[0].score}/100
Critical: ${audit[0].summary?.critical ?? 0}, Warning: ${audit[0].summary?.warning ?? 0}

Findings:
${issues.map((f) => `[${f.severity}] [${f.ruleId}] ${f.message}${f.recommendation ? ` — ${f.recommendation}` : ""}`).join("\n")}`;

      report = await provider.generateJSON({
        system,
        user,
        schema: ImprovementPlanSchema,
      });

      // Store report
      const stored = await db
        .insert(schema.aiReports)
        .values({
          kind: "audit_plan",
          model: "deepseek-v4-flash",
          content: report.overview,
          structured: report as unknown as Record<string, unknown>,
        })
        .returning();

      return NextResponse.json({ reportId: stored[0].id, ...report });
    } catch (aiErr) {
      console.warn("DeepSeek report generation failed:", aiErr);
      return NextResponse.json({
        reportId: null,
        overview: "AI report generation skipped — DeepSeek API key not configured or unavailable.",
        tasks: issues.map((f) => ({
          priority: f.severity === "critical" ? "high" : f.severity === "warning" ? "medium" : "low",
          effort: "medium" as const,
          ruleIds: [f.ruleId],
          action: f.recommendation ?? f.message,
        })),
      });
    }
  } catch (err) {
    console.error("AI report failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI report failed" },
      { status: 500 }
    );
  }
}
