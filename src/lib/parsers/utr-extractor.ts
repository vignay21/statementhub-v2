/**
 * Multi-format extraction pipeline for UTR / Reference identifiers.
 */
export function extractIdentifier(description: string, rawReference: string = ""): string {
  const desc = (description || "").trim();
  const ref = (rawReference || "").trim();

  // 1. CLG (Cheque Clearing)
  const clgMatch = desc.match(/CLG\/[^\/]+\/(\d{6,8})(?:\/|$)/i);
  if (clgMatch) return clgMatch[1];

  // 2. Generic Cheque
  const chqMatch = desc.match(/(?:CHQ|CHEQUE|CHQ NO|CHEQUE NO)[.:\s-]*(\d{6,8})\b/i);
  if (chqMatch) return chqMatch[1];

  // 3. NEFT / RTGS
  const neftMatch = desc.match(/NEFT\s+(?:Cr|Dr)[-\s]+([A-Z0-9]{10,24})\b/i);
  if (neftMatch) return neftMatch[1];

  const rtgsMatch = desc.match(/RTGS\s+(?:Cr|Dr)[-\s]+([A-Z0-9]{10,24})\b/i);
  if (rtgsMatch) return rtgsMatch[1];

  // 4. IMPS
  // Canara trailing 12-digit RRN: e.g. /628418647914
  const canaraImpsMatch = desc.match(/\/(\d{12})\b/);
  if (canaraImpsMatch) return canaraImpsMatch[1];

  // ICICI MMT/IMPS: MMT/IMPS/123456789012
  const iciciImpsMatch = desc.match(/MMT\/IMPS\/(\d{12})\b/i);
  if (iciciImpsMatch) return iciciImpsMatch[1];

  // General IMPS: IMPS-123456789012 or IMPS/123456789012
  const genImpsMatch = desc.match(/IMPS[-/](\d{12})\b/i);
  if (genImpsMatch) return genImpsMatch[1];

  // 5. UPI RRN (12 digits)
  const upiRrnMatch = desc.match(/UPI\/(?:CR|DR)\/(\d{12})\b/i);
  if (upiRrnMatch) return upiRrnMatch[1];

  // 6. Dedicated Reference Column (if valid, not "0" or repeated "00000000")
  if (ref && !/^0+$/.test(ref) && !ref.startsWith("S") && !ref.startsWith("M") && ref.length >= 4) {
    return ref;
  }

  // 7. Embedded bank transaction identifiers: CNRBH... or IN... or 12+ digits
  const cnrbMatch = desc.match(/\b(CNRBH\d{8,})\b/i);
  if (cnrbMatch) return cnrbMatch[1];

  const inMatch = desc.match(/\b(IN\d{12,})\b/i);
  if (inMatch) return inMatch[1];

  const rrn12Match = desc.match(/\b(\d{12})\b/);
  if (rrn12Match) return rrn12Match[1];

  // Return fallback raw reference if available
  return ref && !/^0+$/.test(ref) ? ref : "";
}
