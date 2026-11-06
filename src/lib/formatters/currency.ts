/**
 * Format a number into Indian currency format (e.g. ₹ 62,41,515.00).
 */
export function formatINR(val: number | string | null | undefined, prefix: string = "₹ "): string {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return `${prefix}0.00`;
  }

  const num = typeof val === "string" ? parseFloat(val.replace(/,/g, "")) : val;
  if (isNaN(num)) return `${prefix}0.00`;

  const isNeg = num < 0;
  const absNum = Math.abs(num);
  const parts = absNum.toFixed(2).split(".");
  const intPart = parts[0];
  const decPart = parts[1];

  let formattedInt = "";
  if (intPart.length <= 3) {
    formattedInt = intPart;
  } else {
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    const formattedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formattedInt = `${formattedOthers},${lastThree}`;
  }

  const sign = isNeg ? "-" : "";
  return `${sign}${prefix}${formattedInt}.${decPart}`;
}

export function parseINR(val: string | number): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = val
    .replace(/[₹Rs, ]/gi, "")
    .replace(/^\((.*)\)$/, "-$1")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
