/**
 * PSI Audit Processor
 *
 * Runs PageSpeed Insights and CrUX checks for a URL,
 * stores findings as auditFindings linked to the onpage audit.
 */

import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { settingsService } from "@/server/services/settingsService";
import { runPsi } from "@/server/providers/psi";
import { fetchCrux } from "@/server/providers/crux";

interface PsiAuditJob {
  websiteId: string;
  targetUrl: string;
  userId: string;
  auditId: string;
}

const MOBILE_CWV_THRESHOLDS = {
  lcp: 2500, // ms
  inp: 200,  // ms
  cls: 0.1,
  ttfb: 800, // ms
};

export async function processPsiAudit(job: Job<PsiAuditJob>) {
  const { targetUrl, userId, auditId } = job.data;

  // Get PSI API key
  const psiKey = await settingsService.get(userId, "psi_api_key");
  if (!psiKey) {
    console.log("[psi] No PSI API key configured, skipping");
    return { skipped: true, reason: "no_psi_key" };
  }

  // Run PSI for mobile (primary) and desktop
  const psiMobile = await runPsi(targetUrl, psiKey, "mobile").catch((err) => {
    console.error(`[psi] Mobile PSI failed: ${err.message}`);
    return null;
  });

  const psiDesktop = await runPsi(targetUrl, psiKey, "desktop").catch(() => null);

  // Run CrUX for mobile field data
  const cruxMobile = await fetchCrux(targetUrl, psiKey, "PHONE").catch(() => null);

  // Store findings
  const findings: Array<{
    auditId: string;
    ruleId: string;
    category: string;
    severity: string;
    message: string;
    details: Record<string, unknown>;
    recommendation?: string;
  }> = [];

  // Mobile CWV (field data from CrUX)
  if (cruxMobile) {
    findings.push({
      auditId,
      ruleId: "cwv-field-mobile",
      category: "cwv",
      severity: cwvSeverity(cruxMobile),
      message: `CrUX field data (mobile 75th percentile): LCP ${fmtMs(cruxMobile.lcpP75)}, INP ${cruxMobile.inpP75 ?? "?"}ms, CLS ${cruxMobile.clsP75 ?? "?"}`,
      details: cruxMobile as unknown as Record<string, unknown>,
    });
  }

  // Mobile lab data from PSI
  if (psiMobile) {
    findings.push({
      auditId,
      ruleId: "cwv-lab-mobile",
      category: "cwv",
      severity: psiMobile.performance >= 90 ? "pass" : psiMobile.performance >= 50 ? "warning" : "critical",
      message: `PSI mobile score: ${Math.round(psiMobile.performance)}/100. LCP ${fmtS(psiMobile.lab.lcp)}, TTFB ${psiMobile.lab.ttfb}ms`,
      details: psiMobile as unknown as Record<string, unknown>,
      recommendation: psiMobile.performance < 90 ? "Optimize LCP, reduce JavaScript, and improve server response time." : undefined,
    });
  }

  // Desktop PSI
  if (psiDesktop) {
    findings.push({
      auditId,
      ruleId: "cwv-lab-desktop",
      category: "cwv",
      severity: psiDesktop.performance >= 90 ? "pass" : "info",
      message: `PSI desktop score: ${Math.round(psiDesktop.performance)}/100`,
      details: psiDesktop as unknown as Record<string, unknown>,
    });
  }

  if (!psiMobile && !cruxMobile) {
    findings.push({
      auditId,
      ruleId: "cwv-no-data",
      category: "cwv",
      severity: "info",
      message: "No CWV data available — PSI/CrUX returned no results for this URL",
      details: { url: targetUrl },
      recommendation: "Ensure the URL is publicly accessible. CrUX only has data for URLs with sufficient traffic.",
    });
  }

  // Insert findings
  for (const f of findings) {
    await db.insert(schema.auditFindings).values({
      auditId: f.auditId,
      ruleId: f.ruleId,
      category: f.category as "cwv",
      severity: f.severity as "critical" | "warning" | "info" | "pass",
      message: f.message,
      details: f.details,
      recommendation: f.recommendation ?? null,
    });
  }

  return { psiMobile: !!psiMobile, psiDesktop: !!psiDesktop, cruxMobile: !!cruxMobile, findings: findings.length };
}

function cwvSeverity(crux: { lcpP75: number | null; inpP75: number | null; clsP75: number | null; ttfbP75: number | null }): "pass" | "warning" | "critical" {
  const issues = [];
  if (crux.lcpP75 && crux.lcpP75 > MOBILE_CWV_THRESHOLDS.lcp) issues.push("LCP");
  if (crux.inpP75 && crux.inpP75 > MOBILE_CWV_THRESHOLDS.inp) issues.push("INP");
  if (crux.clsP75 && crux.clsP75 > MOBILE_CWV_THRESHOLDS.cls) issues.push("CLS");
  if (crux.ttfbP75 && crux.ttfbP75 > MOBILE_CWV_THRESHOLDS.ttfb) issues.push("TTFB");

  if (issues.length >= 2) return "critical";
  if (issues.length === 1) return "warning";
  return "pass";
}

function fmtMs(v: number | null): string {
  return v != null ? `${Math.round(v)}ms` : "?";
}

function fmtS(v: number | null): string {
  return v != null ? `${v.toFixed(1)}s` : "?";
}
