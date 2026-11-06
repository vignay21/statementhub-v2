export function parseAmount(val: any): { amount: number; raw: number } {
  if (val === null || val === undefined || val === "") {
    return { amount: 0, raw: 0 };
  }

  if (typeof val === "number") {
    const raw = isNaN(val) ? 0 : val;
    return { amount: Math.abs(raw), raw };
  }

  let text = String(val).trim();
  if (!text) return { amount: 0, raw: 0 };

  // Strip currency prefixes and commas
  text = text.replace(/[₹Rs,]/gi, "").trim();

  // Accounting negative like (1,234.50)
  if (text.startsWith("(") && text.endsWith(")")) {
    text = "-" + text.slice(1, -1).trim();
  }

  const num = parseFloat(text);
  const raw = isNaN(num) ? 0 : num;
  return { amount: Math.abs(raw), raw };
}
