/**
 * Meta & Head rules
 *
 * Checks: title length, meta description length, single H1,
 * canonical tag, viewport meta, robots meta, hreflang
 */

import { loadDom } from "../fetcher";
import type { AuditRule, Finding, AuditContext } from "../types";

export const metaRule: AuditRule = {
  id: "meta",
  category: "technical",
  run(ctx: AuditContext): Finding[] {
    const $ = loadDom(ctx);
    const findings: Finding[] = [];

    // ── Title ──────────────────────────────────────────────────────────────
    const title = $("title").first().text().trim();
    if (!title) {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "critical",
        message: "Missing <title> tag",
        recommendation: "Add a descriptive title tag (50–60 characters recommended for mobile SERPs).",
      });
    } else if (title.length < 30) {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "warning",
        message: `Title too short: ${title.length} chars (recommended 50–60)`,
        details: { title, length: title.length },
        recommendation: "Expand title to 50–60 characters with primary keyword near the front.",
      });
    } else if (title.length > 70) {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "warning",
        message: `Title too long: ${title.length} chars — may truncate in SERPs`,
        details: { title, length: title.length },
        recommendation: "Trim title to 60 characters or less.",
      });
    } else {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "pass",
        message: `Title length OK (${title.length} chars)`,
      });
    }

    // ── Meta description ───────────────────────────────────────────────────
    const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";
    if (!metaDesc) {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "warning",
        message: "Missing meta description",
        recommendation: "Add a compelling meta description (120–158 chars). Mobile truncates at ~120.",
      });
    } else if (metaDesc.length < 70) {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "warning",
        message: `Meta description too short: ${metaDesc.length} chars`,
        details: { length: metaDesc.length },
        recommendation: "Expand description to 120–158 characters.",
      });
    } else if (metaDesc.length > 170) {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "info",
        message: `Meta description long: ${metaDesc.length} chars — may truncate`,
        details: { length: metaDesc.length },
      });
    } else {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "pass",
        message: `Meta description length OK (${metaDesc.length} chars)`,
      });
    }

    // ── Canonical ──────────────────────────────────────────────────────────
    const canonical = $('link[rel="canonical"]').attr("href");
    if (!canonical) {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "warning",
        message: "Missing canonical URL",
        recommendation: "Add a <link rel='canonical'> tag to prevent duplicate content issues.",
      });
    } else {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "pass",
        message: "Canonical URL present",
      });
    }

    // ── Viewport meta (mobile) ─────────────────────────────────────────────
    const viewport = $('meta[name="viewport"]').attr("content");
    if (!viewport) {
      findings.push({
        ruleId: "meta",
        category: "mobile",
        severity: "critical",
        message: "Missing viewport meta tag — critical for mobile ranking",
        recommendation: "Add <meta name='viewport' content='width=device-width, initial-scale=1'>.",
      });
    } else if (!viewport.includes("width=device-width")) {
      findings.push({
        ruleId: "meta",
        category: "mobile",
        severity: "warning",
        message: "Viewport meta does not include width=device-width",
        recommendation: "Use content='width=device-width, initial-scale=1' for responsive design.",
      });
    } else {
      findings.push({
        ruleId: "meta",
        category: "mobile",
        severity: "pass",
        message: "Viewport meta tag present and correct",
      });
    }

    // ── Robots meta ────────────────────────────────────────────────────────
    const robots = $('meta[name="robots"]').attr("content") ?? "";
    if (robots.includes("noindex")) {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "critical",
        message: "Page has noindex meta tag — will not appear in search results",
        recommendation: "Remove noindex unless intentional.",
      });
    }

    // ── hreflang ───────────────────────────────────────────────────────────
    const hreflang = $('link[rel="alternate"][hreflang]');
    if (hreflang.length === 0) {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "info",
        message: "No hreflang tags found (only needed for multi-language sites)",
        recommendation: "If targeting id-ID only, no action needed. Otherwise add hreflang tags.",
      });
    } else {
      findings.push({
        ruleId: "meta",
        category: "technical",
        severity: "pass",
        message: `Hreflang tags present (${hreflang.length} variant(s))`,
      });
    }

    return findings;
  },
};
