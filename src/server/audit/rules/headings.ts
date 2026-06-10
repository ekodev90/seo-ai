/**
 * Heading structure rule
 *
 * Checks: single H1, heading hierarchy (no skipped levels),
 * presence of H2s for content structure
 */

import { loadDom } from "../fetcher";
import type { AuditRule, Finding, AuditContext } from "../types";

export const headingsRule: AuditRule = {
  id: "headings",
  category: "content",
  run(ctx: AuditContext): Finding[] {
    const $ = loadDom(ctx);
    const findings: Finding[] = [];

    const h1s = $("h1");
    const h2s = $("h2");
    const h3s = $("h3");
    const h4s = $("h4");

    // ── H1 count ───────────────────────────────────────────────────────────
    if (h1s.length === 0) {
      findings.push({
        ruleId: "headings",
        category: "content",
        severity: "critical",
        message: "No H1 heading found — critical for SEO structure",
        recommendation: "Add exactly one H1 that describes the page's main topic.",
      });
    } else if (h1s.length > 1) {
      findings.push({
        ruleId: "headings",
        category: "content",
        severity: "warning",
        message: `Multiple H1 headings found (${h1s.length}) — use a single H1 per page`,
        details: { count: h1s.length },
        recommendation: "Consolidate to a single H1. Use H2s for main sections.",
      });
    } else {
      findings.push({
        ruleId: "headings",
        category: "content",
        severity: "pass",
        message: "Single H1 heading found",
      });
    }

    // ── H2 presence ────────────────────────────────────────────────────────
    if (h2s.length === 0) {
      findings.push({
        ruleId: "headings",
        category: "content",
        severity: "warning",
        message: "No H2 headings — page lacks semantic content structure",
        recommendation: "Add H2 headings for each major section of the page.",
      });
    } else {
      findings.push({
        ruleId: "headings",
        category: "content",
        severity: "pass",
        message: `${h2s.length} H2 heading(s) found — good structure`,
      });
    }

    // ── Heading hierarchy (no skipped levels) ──────────────────────────────
    const allHeadings = $("h1, h2, h3, h4, h5, h6").toArray();
    let lastLevel = 0;
    let skipped = false;

    for (const el of allHeadings) {
      const level = parseInt(el.tagName.charAt(1));
      if (lastLevel > 0 && level > lastLevel + 1) {
        skipped = true;
        break;
      }
      lastLevel = level;
    }

    if (skipped) {
      findings.push({
        ruleId: "headings",
        category: "content",
        severity: "warning",
        message: "Heading hierarchy has skipped levels (e.g., H2 → H4)",
        recommendation: "Don't skip heading levels. Use H2→H3→H4 in order.",
      });
    } else if (allHeadings.length > 0) {
      findings.push({
        ruleId: "headings",
        category: "content",
        severity: "pass",
        message: "Heading hierarchy is properly structured",
      });
    }

    return findings;
  },
};
