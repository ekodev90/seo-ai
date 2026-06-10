/**
 * Audit engine types.
 *
 * Implemented in Phase 3. Types defined now as contracts.
 */

export type FindingCategory = "content" | "technical" | "mobile" | "cwv" | "schema" | "aio";
export type FindingSeverity = "critical" | "warning" | "info" | "pass";

export interface Finding {
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  message: string;
  details?: Record<string, unknown>;
  recommendation?: string;
}

export interface AuditContext {
  url: string;
  html: string;
  renderedDom: string; // Cheerio-parsed rendered DOM
  ttfb: number; // ms
  redirectChain: string[];
  mixedContent: string[]; // URLs loaded over HTTP on HTTPS page
}

export interface AuditRule {
  id: string;
  category: FindingCategory;
  run(ctx: AuditContext): Finding[] | Promise<Finding[]>;
}
