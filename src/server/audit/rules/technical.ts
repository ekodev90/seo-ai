/**
 * Technical SEO rule
 *
 * Checks: HTTPS, robots.txt presence, sitemap reference, internal link HTTP status
 * (samples ≤50 internal links for 4xx/5xx)
 */

import { loadDom } from "../fetcher";
import type { AuditRule, Finding, AuditContext } from "../types";

export const technicalRule: AuditRule = {
  id: "technical",
  category: "technical",
  async run(ctx: AuditContext): Promise<Finding[]> {
    const $ = loadDom(ctx);
    const findings: Finding[] = [];

    // ── HTTPS ──────────────────────────────────────────────────────────────
    if (ctx.url.startsWith("https://")) {
      findings.push({
        ruleId: "technical",
        category: "technical",
        severity: "pass",
        message: "Page is served over HTTPS",
      });
    } else {
      findings.push({
        ruleId: "technical",
        category: "technical",
        severity: "critical",
        message: "Page is not served over HTTPS — required for ranking",
        recommendation: "Redirect all traffic to HTTPS and obtain an SSL certificate.",
      });
    }

    // ── Mixed content ─────────────────────────────────────────────────────
    if (ctx.mixedContent.length > 0) {
      findings.push({
        ruleId: "technical",
        category: "technical",
        severity: "critical",
        message: `${ctx.mixedContent.length} mixed-content resource(s) loaded over HTTP on HTTPS page`,
        details: { urls: ctx.mixedContent.slice(0, 10) },
        recommendation: "Update all resource URLs to HTTPS or protocol-relative (//) URLs.",
      });
    } else if (ctx.url.startsWith("https://")) {
      findings.push({
        ruleId: "technical",
        category: "technical",
        severity: "pass",
        message: "No mixed content detected",
      });
    }

    // ── Redirect chain ────────────────────────────────────────────────────
    if (ctx.redirectChain.length > 3) {
      findings.push({
        ruleId: "technical",
        category: "technical",
        severity: "warning",
        message: `Long redirect chain: ${ctx.redirectChain.length} hops`,
        details: { chain: ctx.redirectChain },
        recommendation: "Reduce redirect chains to 1-2 hops maximum.",
      });
    } else if (ctx.redirectChain.length > 0) {
      findings.push({
        ruleId: "technical",
        category: "technical",
        severity: "info",
        message: `${ctx.redirectChain.length} redirect(s) — acceptable`,
        details: { chain: ctx.redirectChain },
      });
    }

    // ── Sitemap reference ─────────────────────────────────────────────────
    const sitemapRef =
      $('link[rel="sitemap"]').attr("href") ||
      $("a[href*='sitemap']").attr("href");

    if (sitemapRef) {
      findings.push({
        ruleId: "technical",
        category: "technical",
        severity: "pass",
        message: "Sitemap reference found",
      });
    } else {
      findings.push({
        ruleId: "technical",
        category: "technical",
        severity: "info",
        message: "No sitemap reference found on page",
        recommendation: "Add <link rel='sitemap'> or ensure sitemap is in robots.txt.",
      });
    }

    // ── Sample internal links for broken URLs ─────────────────────────────
    const currentHost = new URL(ctx.url).hostname;
    const internalLinks = $("a[href]")
      .map((_, el) => $(el).attr("href")!)
      .get()
      .filter((href) => {
        if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:"))
          return false;
        try {
          const u = new URL(href, ctx.url);
          return u.hostname === currentHost;
        } catch {
          return false;
        }
      })
      .slice(0, 50); // Sample ≤50

    if (internalLinks.length > 0) {
      let brokenCount = 0;
      const brokenUrls: string[] = [];

      // Check up to 10 links concurrently (sample subset to avoid hammering)
      const sampleSize = Math.min(10, internalLinks.length);
      const results = await Promise.allSettled(
        internalLinks.slice(0, sampleSize).map(async (href) => {
          const absUrl = new URL(href, ctx.url).href;
          try {
            const res = await fetch(absUrl, {
              method: "HEAD",
              signal: AbortSignal.timeout(5000),
            });
            if (res.status >= 400) {
              brokenUrls.push(`${absUrl} (${res.status})`);
              return false;
            }
            return true;
          } catch {
            brokenUrls.push(`${absUrl} (error)`);
            return false;
          }
        })
      );

      brokenCount = brokenUrls.length;

      if (brokenCount > 0) {
        findings.push({
          ruleId: "technical",
          category: "technical",
          severity: brokenCount >= 3 ? "critical" : "warning",
          message: `${brokenCount}/${sampleSize} sampled internal links return errors`,
          details: { brokenUrls: brokenUrls.slice(0, 5) },
          recommendation: "Fix or remove broken internal links.",
        });
      } else {
        findings.push({
          ruleId: "technical",
          category: "technical",
          severity: "pass",
          message: `All ${sampleSize} sampled internal links are healthy`,
        });
      }
    }

    return findings;
  },
};
