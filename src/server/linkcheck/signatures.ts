/**
 * Indonesian ISP / Kominfo blocking signatures.
 *
 * These patterns match the content of block pages served by Indonesian ISPs
 * when a domain is blocked by Internet Positif / Trust+Positif (Kominfo).
 *
 * Extensible — add new patterns as data, no code changes needed.
 */

export interface BlockSignature {
  /** Where to look for the match */
  type: "host" | "body" | "title";
  /** Case-insensitive regex or exact string match */
  pattern: string;
  /** Human-readable label */
  label: string;
}

/**
 * Blocked: Internet Positif / Trust+Positif (Kominfo) signatures.
 */
export const BLOCK_SIGNATURES: BlockSignature[] = [
  { type: "host", pattern: "trustpositif", label: "Trust+Positif host" },
  { type: "host", pattern: "internetpositif", label: "Internet Positif host" },
  { type: "title", pattern: "internet positif", label: "Internet Positif title" },
  { type: "title", pattern: "trust\\+?positif", label: "Trust+Positif title" },
  { type: "body", pattern: "situs ini diblokir", label: "Block page (ID)" },
  { type: "body", pattern: "website ini telah diblokir", label: "Block page (ID formal)" },
  { type: "body", pattern: "akses situs ini dibatasi", label: "Access restricted page" },
  { type: "body", pattern: "kominfo", label: "Kominfo reference" },
  { type: "body", pattern: "kementerian komunikasi", label: "Kemkominfo reference" },
  { type: "body", pattern: "diblokir berdasarkan", label: "Blocked-by page" },
  { type: "body", pattern: "contains material that is prohibited", label: "ISP block (EN)" },
  { type: "body", pattern: "this site has been blocked", label: "ISP block (EN)" },
];

/**
 * Suspended: registrar / cPanel / hosting suspended-page signatures.
 */
export const SUSPENDED_SIGNATURES: BlockSignature[] = [
  { type: "body", pattern: "serverhold|clienthold", label: "RDAP hold status" },
  { type: "body", pattern: "account suspended", label: "Account suspended" },
  { type: "body", pattern: "website suspended", label: "Website suspended" },
  { type: "body", pattern: "this account has been suspended", label: "cPanel suspended" },
  { type: "body", pattern: "situs ini di-suspend", label: "ID host suspended" },
  { type: "body", pattern: "akun telah di-suspend", label: "ID host suspended (alt)" },
  { type: "body", pattern: "layanan hosting dihentikan", label: "ID hosting stopped" },
  { type: "body", pattern: "website sedang dalam perpanjangan", label: "ID renewal page" },
  { type: "body", pattern: "domain expired", label: "Domain expired" },
  { type: "body", pattern: "this domain has expired", label: "Domain expired (alt)" },
  { type: "body", pattern: "domain tidak ditemukan", label: "ID domain not found" },
  { type: "title", pattern: "suspended", label: "Suspended title" },
  { type: "title", pattern: "account suspended", label: "Suspended title (alt)" },
];

/**
 * Parked: domain parking / for-sale signatures.
 */
export const PARKED_SIGNATURES: BlockSignature[] = [
  { type: "body", pattern: "sedo\\.com", label: "Sedo parking" },
  { type: "body", pattern: "bodis\\.com", label: "Bodis parking" },
  { type: "body", pattern: "domain for sale", label: "Domain for sale" },
  { type: "body", pattern: "this domain is for sale", label: "Domain for sale (alt)" },
  { type: "body", pattern: "this domain may be for sale", label: "Domain may be for sale" },
  { type: "body", pattern: "buy this domain", label: "Buy this domain" },
  { type: "body", pattern: "parkingcrew", label: "ParkingCrew" },
  { type: "body", pattern: "domain parking", label: "Domain parking" },
  { type: "title", pattern: "domain for sale", label: "Domain for sale title" },
  { type: "title", pattern: "this domain is parked", label: "Parked title" },
];

/**
 * Match a signature against a set of text content.
 */
export function matchSignatures(
  signatures: BlockSignature[],
  context: { body: string; title: string; host: string }
): BlockSignature | null {
  for (const sig of signatures) {
    const re = new RegExp(sig.pattern, "i");
    switch (sig.type) {
      case "host":
        if (re.test(context.host)) return sig;
        break;
      case "title":
        if (re.test(context.title)) return sig;
        break;
      case "body":
        if (re.test(context.body)) return sig;
        break;
    }
  }
  return null;
}
