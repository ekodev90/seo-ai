/**
 * Competitor Comparison Engine
 *
 * Runs audits against own + competitor pages through the same pipeline,
 * aggregates PSI/CrUX, SERP positions, AIO citations, and produces
 * a per-dimension diff with winner designation.
 */

import { runAudit } from "@/server/audit/engine";
import { ALL_RULES } from "@/server/audit/rules";
import { runPsi } from "@/server/providers/psi";
import { fetchCrux } from "@/server/providers/crux";
import type { AuditResult } from "@/server/audit/engine";
import type { PsiResult } from "@/server/providers/psi";
import type { CruxRecord } from "@/server/providers/crux";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ComparisonMetrics {
  mine: {
    audit: { score: number; critical: number; warning: number; info: number };
    psi: { mobileScore: number | null; desktopScore: number | null };
    cwv: {
      lcpP75: number | null;
      inpP75: number | null;
      clsP75: number | null;
      ttfbP75: number | null;
    };
    aiOverviewCited: boolean;
    serpPosition: number | null;
  };
  theirs: {
    audit: { score: number; critical: number; warning: number; info: number };
    psi: { mobileScore: number | null; desktopScore: number | null };
    cwv: {
      lcpP75: number | null;
      inpP75: number | null;
      clsP75: number | null;
      ttfbP75: number | null;
    };
    aiOverviewCited: boolean;
    serpPosition: number | null;
  };
}

export interface Dimension {
  name: string;
  mine: number;
  theirs: number;
  delta: number; // positive = mine better
  winner: "mine" | "theirs" | "tie";
  unit: string;
  inverted: boolean; // lower is better
}

export interface ComparisonResult {
  metrics: ComparisonMetrics;
  dimensions: Dimension[];
  overallWinner: "mine" | "theirs" | "tie";
  overallScore: { mine: number; theirs: number };
}

// ── Engine ────────────────────────────────────────────────────────────────────

export async function runComparison(
  myUrl: string,
  theirUrl: string,
  apiKey: string,
  mySerpPosition: number | null,
  theirSerpPosition: number | null,
  myAioCited: boolean,
  theirAioCited: boolean
): Promise<ComparisonResult> {
  // Run audits for both
  const [myAudit, theirAudit, myPsi, theirPsi, myCrux, theirCrux] = await Promise.all([
    runAudit(myUrl, ALL_RULES),
    runAudit(theirUrl, ALL_RULES),
    runPsi(myUrl, apiKey, "mobile").catch(() => null),
    runPsi(theirUrl, apiKey, "mobile").catch(() => null),
    fetchCrux(myUrl, apiKey, "PHONE").catch(() => null),
    fetchCrux(theirUrl, apiKey, "PHONE").catch(() => null),
  ]);

  const metrics: ComparisonMetrics = {
    mine: extractMetrics(myAudit, myPsi, myCrux, mySerpPosition, myAioCited),
    theirs: extractMetrics(theirAudit, theirPsi, theirCrux, theirSerpPosition, theirAioCited),
  };

  const dimensions = buildDimensions(metrics);

  // Overall score: weighted sum across normalized dimensions
  const mineScore = dimensions.reduce((sum, d) => sum + (d.winner === "mine" ? 1 : d.winner === "tie" ? 0.5 : 0), 0);
  const theirsScore = dimensions.reduce((sum, d) => sum + (d.winner === "theirs" ? 1 : d.winner === "tie" ? 0.5 : 0), 0);

  return {
    metrics,
    dimensions,
    overallWinner: mineScore > theirsScore ? "mine" : theirsScore > mineScore ? "theirs" : "tie",
    overallScore: { mine: mineScore, theirs: theirsScore },
  };
}

function extractMetrics(
  audit: AuditResult,
  psi: PsiResult | null,
  crux: CruxRecord | null,
  serpPosition: number | null,
  aioCited: boolean
): ComparisonMetrics["mine"] {
  return {
    audit: {
      score: audit.score,
      critical: audit.summary.critical,
      warning: audit.summary.warning,
      info: audit.summary.info,
    },
    psi: {
      mobileScore: psi ? Math.round(psi.performance) : null,
      desktopScore: null,
    },
    cwv: {
      lcpP75: crux?.lcpP75 ?? null,
      inpP75: crux?.inpP75 ?? null,
      clsP75: crux?.clsP75 ?? null,
      ttfbP75: crux?.ttfbP75 ?? null,
    },
    aiOverviewCited: aioCited,
    serpPosition,
  };
}

function buildDimensions(metrics: ComparisonMetrics): Dimension[] {
  const dims: Dimension[] = [];

  // Audit score
  dims.push(makeDim("Audit Score", metrics.mine.audit.score, metrics.theirs.audit.score, "pts", false));

  // Critical findings (inverted: lower is better)
  dims.push(makeDim("Critical Issues", metrics.mine.audit.critical, metrics.theirs.audit.critical, "", true));

  // Warning findings (inverted)
  dims.push(makeDim("Warnings", metrics.mine.audit.warning, metrics.theirs.audit.warning, "", true));

  // PSI mobile score
  if (metrics.mine.psi.mobileScore != null || metrics.theirs.psi.mobileScore != null) {
    dims.push(makeDim("PSI Mobile", metrics.mine.psi.mobileScore ?? 0, metrics.theirs.psi.mobileScore ?? 0, "pts", false));
  }

  // LCP (inverted)
  if (metrics.mine.cwv.lcpP75 != null || metrics.theirs.cwv.lcpP75 != null) {
    dims.push(makeDim("LCP (ms)", metrics.mine.cwv.lcpP75 ?? 5000, metrics.theirs.cwv.lcpP75 ?? 5000, "ms", true));
  }

  // INP (inverted)
  if (metrics.mine.cwv.inpP75 != null || metrics.theirs.cwv.inpP75 != null) {
    dims.push(makeDim("INP (ms)", metrics.mine.cwv.inpP75 ?? 500, metrics.theirs.cwv.inpP75 ?? 500, "ms", true));
  }

  // CLS (inverted)
  if (metrics.mine.cwv.clsP75 != null || metrics.theirs.cwv.clsP75 != null) {
    dims.push(makeDim("CLS", metrics.mine.cwv.clsP75 ?? 0.5, metrics.theirs.cwv.clsP75 ?? 0.5, "", true));
  }

  // TTFB (inverted)
  if (metrics.mine.cwv.ttfbP75 != null || metrics.theirs.cwv.ttfbP75 != null) {
    dims.push(makeDim("TTFB (ms)", metrics.mine.cwv.ttfbP75 ?? 2000, metrics.theirs.cwv.ttfbP75 ?? 2000, "ms", true));
  }

  // SERP position (inverted: lower = better)
  if (metrics.mine.serpPosition != null || metrics.theirs.serpPosition != null) {
    dims.push(makeDim("SERP Rank", metrics.mine.serpPosition ?? 100, metrics.theirs.serpPosition ?? 100, "", true));
  }

  // AI Overview citation
  dims.push(makeDim("AI Overview Cited", metrics.mine.aiOverviewCited ? 1 : 0, metrics.theirs.aiOverviewCited ? 1 : 0, "", false));

  return dims;
}

function makeDim(name: string, mine: number, theirs: number, unit: string, inverted: boolean): Dimension {
  const delta = inverted ? theirs - mine : mine - theirs;
  let winner: "mine" | "theirs" | "tie";
  if (Math.abs(delta) < 0.01) {
    winner = "tie";
  } else if (inverted) {
    winner = delta > 0 ? "mine" : "theirs";
  } else {
    winner = delta > 0 ? "mine" : "theirs";
  }

  return { name, mine, theirs, delta, winner, unit, inverted };
}
