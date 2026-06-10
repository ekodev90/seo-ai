/**
 * Audit Fetcher
 *
 * Fetches a page and collects everything needed for audit rules:
 * raw HTML, Cheerio-parsed DOM, TTFB, redirect chain, mixed content.
 *
 * Uses Node.js fetch (no Playwright dependency for basic audits).
 * Playwright fetcher for full rendering audits added in Phase 2 later.
 */

import * as cheerio from "cheerio";
import type { AuditContext } from "./types";

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

export async function fetchPage(url: string): Promise<AuditContext> {
  const startTime = Date.now();
  const redirectChain: string[] = [];
  const mixedContent: string[] = [];

  // Fetch with redirect tracking
  let currentUrl = url;
  let html = "";
  let response: Response | null = null;

  for (let i = 0; i < 10; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": MOBILE_UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "id,en;q=0.9",
        },
        redirect: "manual", // We handle redirects ourself to track them
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Timeout fetching ${currentUrl}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    const status = response.status;

    if (status >= 300 && status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      redirectChain.push(currentUrl);
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    // Got final response
    html = await response.text();
    break;
  }

  const ttfb = Date.now() - startTime;
  const finalUrl = currentUrl;

  // Parse HTML with Cheerio
  const $ = cheerio.load(html);

  // Detect mixed content (HTTP resources on HTTPS pages)
  if (finalUrl.startsWith("https://") && !finalUrl.startsWith("https://localhost")) {
    $("img[src^='http://'], script[src^='http://'], link[href^='http://'], iframe[src^='http://']").each(
      (_, el) => {
        const src =
          $(el).attr("src") || $(el).attr("href") || "";
        if (src) mixedContent.push(src);
      }
    );
  }

  return {
    url: finalUrl,
    html,
    renderedDom: html, // Same as raw HTML for fetch-based audits; Playwright would differ
    ttfb,
    redirectChain,
    mixedContent,
  };
}

/**
 * Shortcut: fetch + load Cheerio
 */
export function loadDom(ctx: AuditContext) {
  return cheerio.load(ctx.html);
}
