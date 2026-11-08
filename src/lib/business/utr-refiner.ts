import { extractIdentifier, isIFSCCode } from "../parsers/utr-extractor";

export { isIFSCCode };

/**
 * Standardize and sanitize a UTR / Reference string:
 * If the UTR is an IFSC code (accidental bank code capture), attempt to re-extract
 * the genuine transaction reference from the transaction description.
 */
export function cleanUTR(description: string, utr: string | null | undefined): string {
  const trimmed = (utr || "").trim();
  if (!trimmed) return "";

  if (isIFSCCode(trimmed)) {
    const fixed = extractIdentifier(description, "");
    return isIFSCCode(fixed) ? "" : fixed;
  }

  return trimmed;
}

/**
 * Clean the UTR of a transaction object immutably.
 */
export function cleanTransactionUTR<T extends { description?: string; utr?: string | null }>(t: T): T {
  const cleaned = cleanUTR(t.description || "", t.utr);
  if (cleaned === (t.utr || "")) {
    return t;
  }
  return { ...t, utr: cleaned };
}

/**
 * Legacy refiner helper for fallback extraction
 */
export function refineUTR(description: string, currentUtr: string): string {
  if (currentUtr && currentUtr.length >= 6 && !/^0+$/.test(currentUtr) && !isIFSCCode(currentUtr)) {
    return currentUtr;
  }
  return extractIdentifier(description, currentUtr);
}
