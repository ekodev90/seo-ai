/**
 * Schema / Structured Data rule
 *
 * Checks: JSON-LD validity, recognizes Organization/Article/Breadcrumb/Product.
 * Warns on FAQ/HowTo structured data (dead Google rich result formats as of May 2026).
 */

import { loadDom } from "../fetcher";
import type { AuditRule, Finding, AuditContext } from "../types";

const RECOMMENDED_TYPES = ["Organization", "Article", "BreadcrumbList", "Product", "WebSite"];
const DEPRECATED_TYPES = ["FAQPage", "HowTo"];

export const schemaRule: AuditRule = {
  id: "schema",
  category: "schema",
  run(ctx: AuditContext): Finding[] {
    const $ = loadDom(ctx);
    const findings: Finding[] = [];

    const jsonLdScripts = $('script[type="application/ld+json"]').toArray();

    if (jsonLdScripts.length === 0) {
      findings.push({
        ruleId: "schema",
        category: "schema",
        severity: "warning",
        message: "No JSON-LD structured data found",
        recommendation:
          "Add JSON-LD structured data. At minimum: Organization and WebSite. Article/Breadcrumb/Product as applicable.",
      });
      return findings;
    }

    const parsedTypes: string[] = [];

    jsonLdScripts.forEach((scriptEl, i) => {
      const content = $(scriptEl).html()?.trim();
      if (!content) return;

      try {
        const parsed = JSON.parse(content);

        // Handle both single objects and @graph arrays
        const items = parsed["@graph"] ? parsed["@graph"] : [parsed];

        for (const item of items) {
          const type = item["@type"];
          if (type) {
            parsedTypes.push(type);

            if (DEPRECATED_TYPES.includes(type)) {
              findings.push({
                ruleId: "schema",
                category: "schema",
                severity: "warning",
                message: `${type} structured data found — this rich result format was deprecated by Google (May 2026 for FAQ, earlier for HowTo)`,
                recommendation: `${type} rich results no longer appear in SERPs. Remove or replace with Article/Product schema.`,
              });
            }
          }
        }
      } catch {
        findings.push({
          ruleId: "schema",
          category: "schema",
          severity: "warning",
          message: `JSON-LD block #${i + 1} has invalid JSON syntax`,
          recommendation: "Fix JSON syntax errors in structured data.",
        });
      }
    });

    // ── Coverage of recommended types ────────────────────────────────────
    const foundRecommended = RECOMMENDED_TYPES.filter((t) => parsedTypes.includes(t));
    const missingRecommended = RECOMMENDED_TYPES.filter((t) => !parsedTypes.includes(t));

    if (foundRecommended.length > 0) {
      findings.push({
        ruleId: "schema",
        category: "schema",
        severity: "pass",
        message: `Valid JSON-LD types found: ${foundRecommended.join(", ")}`,
        details: { types: parsedTypes },
      });
    }

    if (missingRecommended.length > 0 && !parsedTypes.some((t) => RECOMMENDED_TYPES.includes(t))) {
      findings.push({
        ruleId: "schema",
        category: "schema",
        severity: "info",
        message: `No recommended schema types found. Consider adding: ${missingRecommended.slice(0, 2).join(", ")}`,
        recommendation:
          "Add Organization and WebSite schema at minimum. Add Article, BreadcrumbList, or Product as relevant.",
      });
    }

    return findings;
  },
};
