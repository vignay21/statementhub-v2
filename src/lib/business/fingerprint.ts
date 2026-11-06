/**
 * Compute SHA-256 fingerprint for a transaction.
 * Signature: Bank | Date | Amount (2dp) | Type | UTR (uppercase) | Description (normalized, uppercase) | Balance (2dp)
 */
export async function computeFingerprint(
  bank: string,
  date: string,
  amount: number,
  type: string,
  utr: string,
  description: string,
  balance?: number | null
): Promise<string> {
  const normBank = (bank || "").trim().toUpperCase();
  const normDate = (date || "").trim();
  const normAmt = Math.abs(amount || 0).toFixed(2);
  const normType = (type || "").trim().toUpperCase();
  const normUtr = (utr || "").trim().toUpperCase();
  const normDesc = (description || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  const normBal = balance !== null && balance !== undefined ? Number(balance).toFixed(2) : "";

  const payload = `${normBank}|${normDate}|${normAmt}|${normType}|${normUtr}|${normDesc}|${normBal}`;

  // If running in browser with SubtleCrypto:
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for Node.js environment:
  try {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(payload).digest("hex");
  } catch {
    // Basic fast hash fallback if crypto is unavailable
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }
}
