/**
 * Identify bank issuing the statement from filename and top header lines.
 */
export function inferBank(filename: string, headerLines: string[] = []): string {
  const combined = [filename, ...headerLines].join(" ").toLowerCase();

  if (combined.includes("hdfc")) return "HDFC Bank";
  if (combined.includes("icici") || combined.includes("icic")) return "ICICI Bank";
  if (combined.includes("canara") || combined.includes("cnrb")) return "Canara Bank";
  if (combined.includes("axis")) return "Axis Bank";
  if (combined.includes("sbi") || combined.includes("state bank")) return "SBI";
  if (combined.includes("kotak")) return "Kotak Bank";

  return "Unknown Bank";
}
