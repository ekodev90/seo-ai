/**
 * Audit Engine
 *
 * Runs all registered audit rules against a page and produces:
 * - Flat list of findings (serializable straight into AI prompts)
 * - Weighted score (critical: -10, warning: -3)
 * - Summary counts
 */

import type { Finding, AuditContext, AuditRule } from "./types";
import { fetchPage } from "./fetcher";

// ── Score weights ────────────────────────────────────────────────────────────

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: -10,
  warning: -3,
  info: 0,
  pass: 0,
};

const MAX_SCORE = 100;

// ── Engine ────────────────────────────────────────────────────────────────────

export interface AuditResult {
  url: string;
  score: number;
  summary: {
    totalFindings: number;
    critical: number;
    warning: number;
    info: number;
    pass: number;
  };
  findings: Finding[];
}

export async function runAudit(
  url: string,
  rules: AuditRule[]
): Promise<AuditResult> {
  // 1. Fetch the page
  const ctx = await fetchPage(url);

  // 2. Run all rules
  const findings: Finding[] = [];
  for (const rule of rules) {
    try {
      const results = await rule.run(ctx);
      findings.push(...results);
    } catch (err) {
      findings.push({
        ruleId: rule.id,
        category: rule.category,
        severity: "info" as const,
        message: `Rule "${rule.id}" failed to run: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // 3. Compute summary
  const summary = {
    totalFindings: findings.length,
    critical: findings.filter((f) => f.severity === "critical").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
    pass: findings.filter((f) => f.severity === "pass").length,
  };

  // 4. Compute weighted score
  const deduction = findings.reduce((sum, f) => sum + (SEVERITY_WEIGHT[f.severity] ?? 0), 0);
  const score = Math.max(0, MAX_SCORE + deduction);

  return {
    url,
    score,
    summary,
    findings,
  };
}
