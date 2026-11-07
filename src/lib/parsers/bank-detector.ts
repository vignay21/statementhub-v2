/**
 * Advanced multi-tier bank detection.
 * Identifies the issuing bank by inspecting:
 * 1. Filename & sheet names
 * 2. Header and cover rows
 * 3. Distinct bank transaction narration patterns (e.g. CNRBH, HDFCH, KKBKH, etc.)
 */
export function inferBank(
  filename: string,
  headerLines: string[] = [],
  sampleDescriptions: string[] = []
): string {
  const combined = [filename, ...headerLines].join(" ").toLowerCase();

  // 1. Direct header / filename matching
  if (combined.includes("hdfc")) return "HDFC Bank";
  if (combined.includes("icici") || combined.includes("icic")) return "ICICI Bank";
  if (combined.includes("canara") || combined.includes("cnrb") || combined.includes("syndicate")) return "Canara Bank";
  if (combined.includes("axis") || combined.includes("utib")) return "Axis Bank";
  if (combined.includes("kotak") || combined.includes("kkbk")) return "Kotak Bank";
  if (combined.includes("sbi") || combined.includes("state bank") || combined.includes("sbin")) return "SBI";

  // 2. Transaction Narration signature analysis (essential for numeric/timestamp filenames like 1793995850997.xlsx)
  const descSample = sampleDescriptions.slice(0, 40).join(" ");
  if (descSample) {
    // Canara Bank: mobile banking NEFT format (CNRBH...), Canara internal transfers, or Canara service charges
    if (
      /\bCNRBH\d|\bCANARA\b|SC NEFT OTHER THAN SB IMB|\bCANARA\/|INET-IMPS-CR\/.*CANARA/i.test(
        descSample
      )
    ) {
      return "Canara Bank";
    }

    // HDFC Bank: NetBanking Mumbai reference (NETBANK, MUM), HDFC NEFT/RTGS UTR prefixes
    if (/\bHDFCH\d|\bHDFCR\d|NETBANK,\s*MUM|\bHDFC0\d/i.test(descSample)) {
      return "HDFC Bank";
    }

    // Kotak Bank: Kotak UTR prefixes (KKBKH..., KKBKR...)
    if (/\bKKBKH\d|\bKKBKR\d|\bKKBK\d{7}/i.test(descSample)) {
      return "Kotak Bank";
    }

    // ICICI Bank: ICICI MMT/IMPS, ICICI RTGS UTR (ICICR...)
    if (/\bMMT\/IMPS|\bICICR\d|\bICIC0SF|\bICIC0\d{6}/i.test(descSample)) {
      return "ICICI Bank";
    }

    // SBI: State Bank RTGS UTR (SBINR...) or INB transfers
    if (/\bSBINR\d|TRANSFER-INB|STATE BANK/i.test(descSample)) {
      return "SBI";
    }

    // Axis Bank: Axis UTR prefixes (UTIBR..., AXOMB...)
    if (/\bUTIBR\d|\bAXOMB|\bUTIB0\d/i.test(descSample)) {
      return "Axis Bank";
    }
  }

  return "Unknown Bank";
}
