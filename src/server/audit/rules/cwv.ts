/**
 * Core Web Vitals rule
 *
 * Checks TTFB and provides CWV context. Full CWV data requires
 * PSI/CrUX API integration (see providers/psi.ts, providers/crux.ts).
 *
 * This rule covers what's available from the fetcher alone.
 * Full CWV audit runs through the PSI provider in Phase 3c.
 */

import type { AuditRule, Finding, AuditContext } from "../types";

const TTFB_THRESHOLD = 800; // ms — mobile-first threshold

export const cwvRule: AuditRule = {
  id: "cwv",
  category: "cwv",
  run(ctx: AuditContext): Finding[] {
    const findings: Finding[] = [];

    // ── TTFB ───────────────────────────────────────────────────────────────
    if (ctx.ttfb <= 200) {
      findings.push({
        ruleId: "cwv",
        category: "cwv",
        severity: "pass",
        message: `TTFB excellent: ${ctx.ttfb}ms (well under 800ms threshold)`,
        details: { ttfb: ctx.ttfb },
      });
    } else if (ctx.ttfb <= TTFB_THRESHOLD) {
      findings.push({
        ruleId: "cwv",
        category: "cwv",
        severity: "pass",
        message: `TTFB OK: ${ctx.ttfb}ms (under 800ms threshold)`,
        details: { ttfb: ctx.ttfb },
      });
    } else if (ctx.ttfb <= 1500) {
      findings.push({
        ruleId: "cwv",
        category: "cwv",
        severity: "warning",
        message: `TTFB slow: ${ctx.ttfb}ms — exceeds 800ms mobile threshold`,
        details: { ttfb: ctx.ttfb, threshold: TTFB_THRESHOLD },
        recommendation:
          "Optimize server response time: use CDN, reduce SSR work, add caching, upgrade hosting.",
      });
    } else {
      findings.push({
        ruleId: "cwv",
        category: "cwv",
        severity: "critical",
        message: `TTFB very slow: ${ctx.ttfb}ms — far exceeds 800ms threshold`,
        details: { ttfb: ctx.ttfb, threshold: TTFB_THRESHOLD },
        recommendation:
          "Urgent: server response time is severely impacting CWV. Consider CDN, edge caching, or hosting upgrade.",
      });
    }

    // ── Redirect chain impact ──────────────────────────────────────────────
    if (ctx.redirectChain.length > 0) {
      findings.push({
        ruleId: "cwv",
        category: "cwv",
        severity: "info",
        message: `${ctx.redirectChain.length} redirect(s) add latency to first byte`,
        details: { redirects: ctx.redirectChain.length },
        recommendation: "Minimize redirect chains. Each hop adds ~200-400ms to TTFB on mobile.",
      });
    }

    // ── Note about full CWV data ───────────────────────────────────────────
    findings.push({
      ruleId: "cwv",
      category: "cwv",
      severity: "info",
      message:
        "Full Core Web Vitals (LCP, INP, CLS) require PageSpeed Insights API. This check covers server-side metrics only.",
      recommendation:
        "Configure a PSI API key in Settings for full field data (CrUX) and lab data (Lighthouse).",
    });

    return findings;
  },
};
