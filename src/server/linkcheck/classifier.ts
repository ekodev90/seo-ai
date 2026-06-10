import {
  matchSignatures,
  BLOCK_SIGNATURES,
  SUSPENDED_SIGNATURES,
  PARKED_SIGNATURES,
} from "./signatures";

export type LinkStatus = "active" | "down" | "suspended" | "blocked" | "parked" | "unknown";

export interface ProbeResult {
  status: LinkStatus;
  httpStatus: number | null;
  latencyMs: number;
  finalUrl: string;
  evidence: Record<string, unknown>;
}

/**
 * Classify a link status from an HTTP probe result.
 *
 * Priority order (first match wins):
 *   1. DNS NXDOMAIN / no response → down
 *   2. Blocked page signatures → blocked
 *   3. Suspended page signatures → suspended
 *   4. Parked page signatures → parked
 *   5. 2xx → active
 *   6. timeout / 5xx → down
 *   7. Everything else → unknown
 */
export function classifyProbe(
  probeData: {
    httpStatus: number | null;
    error?: string;
    body?: string;
    title?: string;
    finalHost?: string;
    latencyMs: number;
    finalUrl: string;
  }
): ProbeResult {
  const { httpStatus, error, body = "", title = "", finalHost = "", latencyMs, finalUrl } = probeData;

  // 1. DNS failure or no response
  if (error && (error.includes("ENOTFOUND") || error.includes("NXDOMAIN") || error.includes("EAI_AGAIN"))) {
    return {
      status: "down",
      httpStatus,
      latencyMs,
      finalUrl,
      evidence: { reason: "dns_nxdomain", error },
    };
  }

  // 2. Check block/suspend/park signatures against body/title/host
  const context = { body, title, host: finalHost };

  const blockMatch = matchSignatures(BLOCK_SIGNATURES, context);
  if (blockMatch) {
    return {
      status: "blocked",
      httpStatus,
      latencyMs,
      finalUrl,
      evidence: { reason: "block_signature", matched: blockMatch.label },
    };
  }

  const suspendMatch = matchSignatures(SUSPENDED_SIGNATURES, context);
  if (suspendMatch) {
    return {
      status: "suspended",
      httpStatus,
      latencyMs,
      finalUrl,
      evidence: { reason: "suspend_signature", matched: suspendMatch.label },
    };
  }

  const parkedMatch = matchSignatures(PARKED_SIGNATURES, context);
  if (parkedMatch) {
    return {
      status: "parked",
      httpStatus,
      latencyMs,
      finalUrl,
      evidence: { reason: "parked_signature", matched: parkedMatch.label },
    };
  }

  // 3. HTTP status classification
  if (httpStatus) {
    if (httpStatus >= 200 && httpStatus < 400) {
      return {
        status: "active",
        httpStatus,
        latencyMs,
        finalUrl,
        evidence: { reason: `http_${httpStatus}` },
      };
    }

    if (httpStatus >= 500 || httpStatus === 0) {
      return {
        status: "down",
        httpStatus,
        latencyMs,
        finalUrl,
        evidence: { reason: `http_${httpStatus}` },
      };
    }

    // 4xx — could be temporary, mark as down for monitoring
    if (httpStatus >= 400) {
      return {
        status: "down",
        httpStatus,
        latencyMs,
        finalUrl,
        evidence: { reason: `http_${httpStatus}` },
      };
    }
  }

  // 5. Request error (timeout, connection refused, etc.)
  if (error) {
    return {
      status: "down",
      httpStatus,
      latencyMs,
      finalUrl,
      evidence: { reason: "request_error", error },
    };
  }

  return {
    status: "unknown",
    httpStatus,
    latencyMs,
    finalUrl,
    evidence: { reason: "no_match" },
  };
}
