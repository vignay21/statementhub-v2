/**
 * Multi-format extraction pipeline for UTR / Reference identifiers.
 * Filters out IFSC codes, transaction keywords, and invalid tokens.
 */

// Strict RBI IFSC standard: 4 alphabetic characters + '0' + 6 alphanumeric characters
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

const INVALID_KEYWORDS = new Set([
  "0",
  "00",
  "000",
  "0000",
  "00000",
  "000000",
  "00000000",
  "000000000000",
  "NAN",
  "NULL",
  "UNDEFINED",
  "NA",
  "N/A",
  "NONE",
  "OTHER",
  "CHARGES",
  "TRANSFER",
  "PAYMENT",
  "DR",
  "CR",
  "NEFT",
  "RTGS",
  "IMPS",
  "UPI",
  "CHQ",
  "CHEQUE",
  "BIL",
  "CMS",
  "CLEARING",
  "INTERNAL",
]);

/**
 * Checks whether a given string is an Indian Financial System Code (IFSC).
 * e.g. KKBK0007679, SBIN0021370, DBSS0IN0811, etc.
 * IFSC codes represent bank branches and must NEVER be treated as a transaction UTR.
 */
export function isIFSCCode(code: string): boolean {
  if (!code) return false;
  return IFSC_REGEX.test(code.trim());
}

/**
 * Validates whether a token qualifies as a genuine UTR / reference number.
 */
export function isValidUTR(cand: string): boolean {
  if (!cand) return false;
  const trimmed = cand.trim();
  if (trimmed.length < 4 || trimmed.length > 35) return false;
  if (INVALID_KEYWORDS.has(trimmed.toUpperCase())) return false;
  // IFSC codes are bank branch codes, never UTRs
  if (isIFSCCode(trimmed)) return false;
  // Ignore ICICI internal session IDs (e.g. S123456 or M123456)
  if (/^[SM]\d+$/i.test(trimmed)) return false;
  // Valid UTRs / check numbers must contain at least one digit
  if (!/\d/.test(trimmed)) return false;
  // Exclude long timestamp/datetime strings
  if (trimmed.length > 24 && trimmed.startsWith("202")) return false;
  return true;
}

export function extractIdentifier(description: string, rawReference: string = ""): string {
  const desc = (description || "").trim();
  let ref = (rawReference || "").trim();

  // If rawReference is an IFSC code, reject it immediately
  if (isIFSCCode(ref)) {
    ref = "";
  }

  // 1. CLG (Cheque Clearing)
  if (desc.toUpperCase().includes("CLG")) {
    const parts = desc.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3 && parts[0].toUpperCase() === "CLG") {
      if (parts[2].length >= 6 && /^\d+$/.test(parts[2])) return parts[2];
      if (parts[1].length >= 6 && /^\d+$/.test(parts[1])) return parts[1];
    }
    const clgMatch = desc.match(/CLG\/[^\/]+\/(\d{6,8})(?:\/|$)/i);
    if (clgMatch) return clgMatch[1];
  }

  // 2. Generic Cheque
  const chqMatch = desc.match(/\b(?:CHQ|CHEQUE|CHQ NO|CHEQUE NO|CHEQ|CHK)[.:\s-]*(\d{6,8})\b/i);
  if (chqMatch) return chqMatch[1];

  // 3. RTGS UTR (Standard RBI format: 4 letters + R/C/H + 11-17 digits, e.g. SBINR52026100144594496, KKBKR5...)
  const rtgsUtrToken = desc.match(/\b([A-Za-z]{4}[RCH]\d{11,17})\b/i);
  if (rtgsUtrToken && isValidUTR(rtgsUtrToken[1])) {
    return rtgsUtrToken[1].toUpperCase();
  }

  // RTGS CR/DR with chained parts (e.g. RTGS CR-SBIN0021370-P SUDHAKAR-K JHANSI-SBINR52026100144594496)
  const rtgsLongMatch = desc.match(/\bRTGS\s+(?:Cr|Dr)[-\s/]+(?:[A-Za-z0-9]+[-\s/]+){1,3}([A-Za-z0-9]{16,24})\b/i);
  if (rtgsLongMatch && isValidUTR(rtgsLongMatch[1])) {
    return rtgsLongMatch[1].toUpperCase();
  }

  // 4. NEFT / RTGS hyphenated or slash candidates
  // e.g. NEFT Cr-0811OP6182246121-DBSS0IN0811-NAGARJUNA MEDICAL AGENCIES-
  //      NEFT CR-KKBK0007679-PARTY NAME-123456789012
  if (/\b(?:NEFT|RTGS)\b/i.test(desc)) {
    // Check tokens after NEFT/RTGS Cr/Dr
    const matchChains = Array.from(desc.matchAll(/\b(?:NEFT|RTGS)\s*(?:Cr|Dr)?[-\s/]+([A-Za-z0-9]{10,24})\b/gi));
    for (const match of matchChains) {
      const cand = match[1]?.trim();
      if (cand && isValidUTR(cand)) {
        return cand.toUpperCase();
      }
    }

    // Scan all hyphen/slash/space delimited tokens in the description that match UTR criteria
    const segments = desc.split(/[\s\/-]+/).map((s) => s.trim());
    for (const seg of segments) {
      if (seg.length >= 10 && isValidUTR(seg)) {
        return seg.toUpperCase();
      }
    }
  }

  // 5. Dedicated Reference Column (if valid and not an IFSC code)
  if (ref && isValidUTR(ref)) {
    return ref;
  }

  // 6. IMPS
  if (desc.toUpperCase().includes("IMPS")) {
    // Canara trailing 12-digit RRN: e.g. /628418647914
    const canaraImpsMatch = desc.match(/\/(\d{12})\b/);
    if (canaraImpsMatch) return canaraImpsMatch[1];

    // ICICI MMT/IMPS: MMT/IMPS/123456789012
    const iciciImpsMatch = desc.match(/\bMMT\/IMPS\/(\d{12})\b/i);
    if (iciciImpsMatch) return iciciImpsMatch[1];

    // General IMPS: IMPS-123456789012 or IMPS/123456789012
    const genImpsMatch = desc.match(/\bIMPS[-\s/]+(\d{12})\b/i);
    if (genImpsMatch) return genImpsMatch[1];
  }

  // 7. UPI RRN (12 digits)
  const upiRrnMatch = desc.match(/\bUPI\/(?:CR|DR)\/(\d{12})\b/i) || desc.match(/\bUPI[-/](\d{12})\b/i);
  if (upiRrnMatch) return upiRrnMatch[1];

  // 8. Embedded bank transaction identifiers: CNRBH... or IN... or 12+ digits
  const cnrbMatch = desc.match(/\b(CNRBH\d{8,})\b/i);
  if (cnrbMatch && isValidUTR(cnrbMatch[1])) return cnrbMatch[1].toUpperCase();

  const inMatch = desc.match(/\b(IN\d{12,})\b/i);
  if (inMatch && isValidUTR(inMatch[1])) return inMatch[1].toUpperCase();

  const rrn12Match = desc.match(/\b(\d{12})\b/);
  if (rrn12Match) return rrn12Match[1];

  // 9. Fallback: only return ref if it is a valid non-IFSC reference
  return ref && isValidUTR(ref) ? ref : "";
}
