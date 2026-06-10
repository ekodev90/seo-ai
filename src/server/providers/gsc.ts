/**
 * Google Search Console Provider
 *
 * Uses service account auth. The service account email must be added
 * as a user to each GSC property being queried.
 *
 * API: https://developers.google.com/webmaster-tools/search-console-api-original/v3/
 *
 * Primary rank source for own sites — free, reliable, official Google data.
 */

interface GscCredentials {
  type: "service_account";
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface GscQueryRow {
  keys: string[]; // [query, page, device] in order of requested dimensions
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscResponse {
  rows?: GscQueryRow[];
  responseAggregationType?: string;
}

interface FetchOptions {
  siteUrl: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  dimensions?: ("query" | "page" | "device" | "date" | "country")[];
  rowLimit?: number; // max 25000
  dataState?: "all" | "final";
}

/**
 * Get a Google OAuth2 access token using the service account.
 */
async function getAccessToken(credentials: GscCredentials): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: credentials.private_key_id,
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: credentials.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const unsignedToken = `${encode(header)}.${encode(claim)}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(credentials.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signedToken = `${unsignedToken}.${Buffer.from(signature).toString("base64url")}`;

  const response = await fetch(credentials.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedToken}`,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GSC auth failed: ${response.status} ${err}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  return Buffer.from(b64, "base64").buffer as ArrayBuffer;
}

/**
 * Fetch Search Analytics data from GSC API.
 */
export async function fetchSearchAnalytics(
  credentials: GscCredentials,
  opts: FetchOptions
): Promise<GscQueryRow[]> {
  const accessToken = await getAccessToken(credentials);

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(opts.siteUrl)}/searchAnalytics/query`;

  const body = {
    startDate: opts.startDate,
    endDate: opts.endDate,
    dimensions: opts.dimensions ?? ["query", "page", "device"],
    rowLimit: opts.rowLimit ?? 25000,
    dataState: opts.dataState ?? "all",
    startRow: 0,
  };

  let allRows: GscQueryRow[] = [];
  let startRow = 0;

  // Paginate through results
  while (true) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, startRow }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`GSC API error: ${response.status} ${err}`);
    }

    const data = (await response.json()) as GscResponse;

    if (data.rows?.length) {
      allRows = allRows.concat(data.rows);
    }

    // If less than rowLimit returned, we've got everything
    if (!data.rows || data.rows.length < (opts.rowLimit ?? 25000)) {
      break;
    }

    startRow += opts.rowLimit ?? 25000;
  }

  return allRows;
}

/**
 * Parse GSC rows into structured records for db insertion.
 */
export function parseGscRows(
  rows: GscQueryRow[],
  dimensions: string[]
): Array<{
  query: string;
  page: string;
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}> {
  return rows.map((row) => {
    const record: Record<string, string> = {};
    dimensions.forEach((dim, i) => {
      record[dim] = row.keys[i];
    });

    return {
      query: record.query ?? "",
      page: record.page ?? "",
      device: record.device ?? "DESKTOP",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    };
  });
}
