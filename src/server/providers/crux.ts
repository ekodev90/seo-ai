/**
 * Chrome UX Report (CrUX) Provider
 *
 * Standalone CrUX API for field data when PSI's embedded field data
 * is being discontinued. Requires a Google API key.
 *
 * https://developer.chrome.com/docs/crux/api/
 */

export interface CruxRecord {
  lcpP75: number | null;
  inpP75: number | null;
  clsP75: number | null;
  ttfbP75: number | null;
  fcpP75: number | null;
}

export async function fetchCrux(
  url: string,
  apiKey: string,
  formFactor: "PHONE" | "DESKTOP" = "PHONE"
): Promise<CruxRecord> {
  const body = {
    url,
    formFactor,
    metrics: [
      "largest_contentful_paint",
      "interaction_to_next_paint",
      "cumulative_layout_shift",
      "experimental_time_to_first_byte",
      "first_contentful_paint",
    ],
  };

  const response = await fetch(
    `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    // CrUX returns 404 if no data for the URL — not an error
    if (response.status === 404) {
      return { lcpP75: null, inpP75: null, clsP75: null, ttfbP75: null, fcpP75: null };
    }
    throw new Error(`CrUX API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const record = (data.record ?? {}) as Record<string, unknown>;
  const metrics = (record.metrics ?? {}) as Record<string, Record<string, unknown>>;

  return {
    lcpP75: getP75(metrics, "largest_contentful_paint"),
    inpP75: getP75(metrics, "interaction_to_next_paint"),
    clsP75: getCls(metrics, "cumulative_layout_shift"),
    ttfbP75: getP75(metrics, "experimental_time_to_first_byte"),
    fcpP75: getP75(metrics, "first_contentful_paint"),
  };
}

function getP75(metrics: Record<string, Record<string, unknown>>, key: string): number | null {
  const m = metrics[key];
  if (!m?.percentiles) return null;
  return (m.percentiles as Record<string, number>).p75 ?? null;
}

function getCls(metrics: Record<string, Record<string, unknown>>, key: string): number | null {
  const m = metrics[key];
  if (!m?.percentiles) return null;
  const p75 = (m.percentiles as Record<string, number>).p75;
  // CrUX returns CLS in hundredths; normalize to 0-1 scale
  return p75 != null ? p75 / 100 : null;
}
