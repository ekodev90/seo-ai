/**
 * PageSpeed Insights Provider
 *
 * Free API, ~25k requests/day with API key.
 * Returns lab data (Lighthouse) and field data (CrUX) in a single call.
 *
 * https://developers.google.com/speed/docs/insights/v5/about
 */

export interface PsiResult {
  url: string;
  strategy: "mobile" | "desktop";
  performance: number; // 0–100
  lab: {
    lcp: number | null; // seconds
    inp: number | null; // ms
    cls: number | null;
    ttfb: number | null; // ms
    fcp: number | null; // seconds
    speedIndex: number | null;
  };
  field: {
    lcpP75: number | null;
    inpP75: number | null;
    clsP75: number | null;
    ttfbP75: number | null;
    fcpP75: number | null;
  } | null;
}

export async function runPsi(
  url: string,
  apiKey: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<PsiResult> {
  const params = new URLSearchParams({
    url,
    key: apiKey,
    strategy,
    category: "performance",
  });

  const response = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PSI API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const lighthouse = (data.lighthouseResult ?? {}) as Record<string, unknown>;
  const audits = (lighthouse.audits ?? {}) as Record<string, Record<string, unknown>>;
  const loadingExperience = (data.loadingExperience ?? {}) as Record<string, unknown>;
  const metrics = (loadingExperience.metrics ?? {}) as Record<string, unknown>;

  // Lab data from Lighthouse
  const lab = {
    lcp: numericAuditValue(audits, "largest-contentful-paint"),
    inp: null, // INP not available in lab data
    cls: numericAuditValue(audits, "cumulative-layout-shift"),
    ttfb: numericAuditValue(audits, "server-response-time"),
    fcp: numericAuditValue(audits, "first-contentful-paint"),
    speedIndex: numericAuditValue(audits, "speed-index"),
  };

  // Field data from CrUX
  const field = loadingExperience?.metrics
    ? {
        lcpP75: p75(metrics, "LARGEST_CONTENTFUL_PAINT_MS"),
        inpP75: p75(metrics, "INTERACTION_TO_NEXT_PAINT"),
        clsP75: clsFraction(metrics, "CUMULATIVE_LAYOUT_SHIFT_SCORE"),
        ttfbP75: p75(metrics, "EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
        fcpP75: p75(metrics, "FIRST_CONTENTFUL_PAINT_MS"),
      }
    : null;

  return {
    url,
    strategy,
    performance: (((lighthouse.categories as Record<string, unknown>)?.performance as Record<string, number>)?.score ?? 0) * 100,
    lab,
    field,
  };
}

function numericAuditValue(audits: Record<string, Record<string, unknown>>, key: string): number | null {
  return audits[key]?.numericValue as number | null;
}

function p75(metrics: Record<string, unknown>, key: string): number | null {
  const m = metrics[key] as Record<string, unknown> | undefined;
  if (!m?.percentiles) return null;
  return (m.percentiles as Record<string, number>).p75 ?? null;
}

function clsFraction(metrics: Record<string, unknown>, key: string): number | null {
  const m = metrics[key] as Record<string, unknown> | undefined;
  if (!m?.percentiles) return null;
  const p75Val = (m.percentiles as Record<string, number>).p75;
  return p75Val != null ? p75Val / 100 : null;
}
