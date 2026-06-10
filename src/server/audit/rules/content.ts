/**
 * Content quality rule
 *
 * Checks: word count (thin content <300 words), answer-first structure
 * for AI Overview eligibility (40–80 word answer under question headings)
 */

import { loadDom } from "../fetcher";
import type { AuditRule, Finding, AuditContext } from "../types";

export const contentRule: AuditRule = {
  id: "content",
  category: "content",
  run(ctx: AuditContext): Finding[] {
    const $ = loadDom(ctx);
    const findings: Finding[] = [];

    // ── Word count ─────────────────────────────────────────────────────────
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const words = bodyText.split(/\s+/).filter((w) => w.length > 1); // Skip single chars
    const wordCount = words.length;

    if (wordCount < 50) {
      findings.push({
        ruleId: "content",
        category: "content",
        severity: "critical",
        message: `Severely thin content: ~${wordCount} words. Minimum 300 recommended.`,
        details: { wordCount },
        recommendation:
          "Expand content to at least 300 words with substantive information about the topic.",
      });
    } else if (wordCount < 300) {
      findings.push({
        ruleId: "content",
        category: "content",
        severity: "warning",
        message: `Thin content: ~${wordCount} words. Aim for 300+ words for SEO.`,
        details: { wordCount },
        recommendation:
          "Add more substantive content — aim for 300+ words with topic coverage.",
      });
    } else {
      findings.push({
        ruleId: "content",
        category: "content",
        severity: "pass",
        message: `Content length OK (~${wordCount} words)`,
      });
    }

    // ── AI Overview answer-first structure ─────────────────────────────────
    // Heuristic: check if H2 headings are question-like and followed by
    // a concise answer (40-80 words) before expanding

    const questionH2s = $("h2")
      .filter((_, el) => {
        const text = $(el).text().toLowerCase().trim();
        return (
          text.startsWith("apa") ||
          text.startsWith("bagaimana") ||
          text.startsWith("mengapa") ||
          text.startsWith("kapan") ||
          text.startsWith("siapa") ||
          text.startsWith("dimana") ||
          text.includes("?") ||
          text.startsWith("what") ||
          text.startsWith("how") ||
          text.startsWith("why") ||
          text.startsWith("when")
        );
      });

    if (questionH2s.length === 0) {
      findings.push({
        ruleId: "content",
        category: "aio",
        severity: "info",
        message:
          "No question-style headings found. Answer-first structure (question heading + 40-80 word answer) improves AI Overview citations.",
        recommendation:
          "Add H2 headings framed as questions your audience asks, followed by a concise answer paragraph.",
      });
    } else {
      // Check if questions are followed by a concise answer block
      let answerFirstCount = 0;
      questionH2s.each((_, el) => {
        const $el = $(el);
        const nextP = $el.nextAll("p").first();
        const answerText = nextP.text().trim();
        const answerWords = answerText.split(/\s+/).length;
        if (answerWords >= 10 && answerWords <= 120) {
          answerFirstCount++;
        }
      });

      if (answerFirstCount >= questionH2s.length * 0.5) {
        findings.push({
          ruleId: "content",
          category: "aio",
          severity: "pass",
          message: `${answerFirstCount}/${questionH2s.length} question headings have answer-first structure — good for AI Overviews`,
        });
      } else {
        findings.push({
          ruleId: "content",
          category: "aio",
          severity: "info",
          message: `${questionH2s.length} question headings found, but ${questionH2s.length - answerFirstCount} missing concise answer paragraphs`,
          recommendation:
            "Under each question heading, add a 40-80 word direct answer before expanding on the topic. This increases AI Overview citation probability.",
        });
      }
    }

    return findings;
  },
};
