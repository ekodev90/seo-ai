/**
 * Mobile-friendly rule
 *
 * Checks: font-size ≥12px, tap target sizes (approximate from inline styles),
 * interstitial heuristic (fixed-position elements >30% viewport)
 *
 * Note: Full tap target measurement requires Playwright rendering.
 * This rule uses Cheerio-based heuristics as a best-effort check.
 */

import { loadDom } from "../fetcher";
import type { AuditRule, Finding, AuditContext } from "../types";

export const mobileRule: AuditRule = {
  id: "mobile",
  category: "mobile",
  run(ctx: AuditContext): Finding[] {
    const $ = loadDom(ctx);
    const findings: Finding[] = [];

    // ── Font size ≥12px ────────────────────────────────────────────────────
    // Check inline styles and common small-text patterns
    let tinyFontCount = 0;
    $("[style*='font-size']").each((_, el) => {
      const style = $(el).attr("style") ?? "";
      const match = style.match(/font-size\s*:\s*(\d+)px/i);
      if (match && parseInt(match[1]) < 12) {
        tinyFontCount++;
      }
    });

    // Also check <small> tags and elements with font-size classes (heuristic)
    $("small, .text-xs, .text-2xs, .text-xxs, [class*='text-1'], [class*='text-10']").each((_, el) => {
      if (!$(el).attr("style")?.includes("font-size")) {
        tinyFontCount++;
      }
    });

    if (tinyFontCount > 10) {
      findings.push({
        ruleId: "mobile",
        category: "mobile",
        severity: "warning",
        message: `${tinyFontCount} elements may have font-size below 12px — hard to read on mobile`,
        recommendation:
          "Ensure all body text is at least 12px on mobile. Use relative units (rem/em) for better scaling.",
      });
    } else if (tinyFontCount > 0) {
      findings.push({
        ruleId: "mobile",
        category: "mobile",
        severity: "info",
        message: `${tinyFontCount} elements with potentially small font size`,
        details: { count: tinyFontCount },
      });
    } else {
      findings.push({
        ruleId: "mobile",
        category: "mobile",
        severity: "pass",
        message: "No obvious tiny-font elements detected",
      });
    }

    // ── Tap target approximate check ───────────────────────────────────────
    // Check for inline small dimensions on links/buttons
    let tinyTapTargets = 0;
    $("a, button, [role='button'], input[type='submit']").each((_, el) => {
      const style = $(el).attr("style") ?? "";
      const widthMatch = style.match(/width\s*:\s*(\d+)px/i);
      const heightMatch = style.match(/height\s*:\s*(\d+)px/i);
      const minWidthMatch = style.match(/min-width\s*:\s*(\d+)px/i);
      const minHeightMatch = style.match(/min-height\s*:\s*(\d+)px/i);

      const width = widthMatch ? parseInt(widthMatch[1]) : null;
      const height = heightMatch ? parseInt(heightMatch[1]) : null;
      const minWidth = minWidthMatch ? parseInt(minWidthMatch[1]) : null;
      const minHeight = minHeightMatch ? parseInt(minHeightMatch[1]) : null;

      if (
        (width !== null && width < 48) ||
        (height !== null && height < 48) ||
        (minWidth !== null && minWidth < 48) ||
        (minHeight !== null && minHeight < 48)
      ) {
        tinyTapTargets++;
      }
    });

    if (tinyTapTargets > 0) {
      findings.push({
        ruleId: "mobile",
        category: "mobile",
        severity: "warning",
        message: `${tinyTapTargets} interactive elements may have tap targets smaller than 48px`,
        details: { count: tinyTapTargets },
        recommendation:
          "Ensure all interactive elements (buttons, links) have tap targets ≥48×48px with 8px spacing.",
      });
    } else {
      findings.push({
        ruleId: "mobile",
        category: "mobile",
        severity: "pass",
        message: "No undersized tap targets detected (best-effort check)",
      });
    }

    // ── Interstitial heuristic ─────────────────────────────────────────────
    // Check for fixed-position overlay elements covering >30% viewport
    const fixedOverlays = $(
      "[style*='position:fixed'], [style*='position: fixed'], .modal, .overlay, .popup, [class*='cookie-banner']"
    );
    let largeOverlays = 0;
    fixedOverlays.each((_, el) => {
      const style = $(el).attr("style") ?? "";
      const top = style.match(/top\s*:\s*0/);
      const bottom = style.match(/bottom\s*:\s*0/);
      // Heuristic: element at top or bottom spanning full width
      if (top || bottom) {
        largeOverlays++;
      }
    });

    if (largeOverlays > 0) {
      findings.push({
        ruleId: "mobile",
        category: "mobile",
        severity: "warning",
        message: `${largeOverlays} fixed-position overlay(s) detected — may trigger Google's intrusive interstitial penalty`,
        details: { count: largeOverlays },
        recommendation:
          "Ensure any popups or banners are easy to dismiss and don't cover main content. Avoid full-screen interstitials.",
      });
    } else {
      findings.push({
        ruleId: "mobile",
        category: "mobile",
        severity: "pass",
        message: "No intrusive interstitials detected",
      });
    }

    return findings;
  },
};
