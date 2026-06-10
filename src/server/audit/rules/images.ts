/**
 * Image optimization rule
 *
 * Checks: alt text on all images, lazy loading (not on first/LCP image),
 * explicit width/height attributes, responsive images
 */

import { loadDom } from "../fetcher";
import type { AuditRule, Finding, AuditContext } from "../types";

export const imagesRule: AuditRule = {
  id: "images",
  category: "technical",
  run(ctx: AuditContext): Finding[] {
    const $ = loadDom(ctx);
    const findings: Finding[] = [];

    const images = $("img").toArray();
    if (images.length === 0) {
      findings.push({
        ruleId: "images",
        category: "technical",
        severity: "info",
        message: "No images found on page",
      });
      return findings;
    }

    let missingAlt = 0;
    let missingDimensions = 0;
    let lazyLcpCandidate = false;

    const firstImg = images[0];

    images.forEach((img, i) => {
      const el = $(img);
      const alt = el.attr("alt");
      const width = el.attr("width");
      const height = el.attr("height");
      const loading = el.attr("loading");

      if (alt === undefined || alt === "") {
        missingAlt++;
      }

      if (!width || !height) {
        missingDimensions++;
      }

      // Lazy loading on first image (likely LCP)
      if (i === 0 && loading === "lazy") {
        lazyLcpCandidate = true;
      }
    });

    // ── Alt text ───────────────────────────────────────────────────────────
    if (missingAlt > 0) {
      findings.push({
        ruleId: "images",
        category: "technical",
        severity: missingAlt === images.length ? "critical" : "warning",
        message: `${missingAlt}/${images.length} image(s) missing alt text`,
        details: { missing: missingAlt, total: images.length },
        recommendation: "Add descriptive alt text to all images for accessibility and SEO.",
      });
    } else {
      findings.push({
        ruleId: "images",
        category: "technical",
        severity: "pass",
        message: `All ${images.length} images have alt text`,
      });
    }

    // ── Width/height attributes ────────────────────────────────────────────
    if (missingDimensions > 0) {
      findings.push({
        ruleId: "images",
        category: "technical",
        severity: "warning",
        message: `${missingDimensions}/${images.length} image(s) missing width/height attributes (prevents CLS)`,
        details: { missing: missingDimensions, total: images.length },
        recommendation: "Add explicit width and height attributes to all <img> tags to prevent layout shift.",
      });
    }

    // ── Lazy loading on LCP image ──────────────────────────────────────────
    const firstImgLoading = $(firstImg).attr("loading");
    if (lazyLcpCandidate) {
      findings.push({
        ruleId: "images",
        category: "cwv",
        severity: "critical",
        message: "First image has loading='lazy' — likely the LCP image. This delays Largest Contentful Paint.",
        recommendation: "Remove loading='lazy' from the LCP candidate image. Use eager or omit the attribute.",
      });
    } else if (firstImgLoading === "eager" || !firstImgLoading) {
      findings.push({
        ruleId: "images",
        category: "cwv",
        severity: "pass",
        message: "First image does not use lazy loading — good for LCP",
      });
    }

    // ── Lazy loading on other images ───────────────────────────────────────
    const lazyCount = images.filter((_, i) => i > 0 && $(images[i]).attr("loading") === "lazy").length;
    const otherCount = images.length - 1;
    if (otherCount > 0 && lazyCount < otherCount) {
      findings.push({
        ruleId: "images",
        category: "cwv",
        severity: "info",
        message: `${otherCount - lazyCount}/${otherCount} below-fold images could use loading='lazy'`,
        recommendation: "Add loading='lazy' to below-fold images to improve page load performance.",
      });
    }

    return findings;
  },
};
