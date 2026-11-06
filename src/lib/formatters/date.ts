/**
 * Format and parse dates in Indian format (DD-MM-YYYY).
 */
export function normalizeDate(raw: string | number | Date | null | undefined): string {
  if (!raw) return "";

  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return "";
    const d = String(raw.getDate()).padStart(2, "0");
    const m = String(raw.getMonth() + 1).padStart(2, "0");
    const y = raw.getFullYear();
    return `${d}-${m}-${y}`;
  }

  // Handle Excel serial date
  if (typeof raw === "number") {
    // Excel base date: 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const dateObj = new Date(excelEpoch.getTime() + raw * 86400000);
    if (!isNaN(dateObj.getTime())) {
      const d = String(dateObj.getDate()).padStart(2, "0");
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const y = dateObj.getFullYear();
      return `${d}-${m}-${y}`;
    }
  }

  const str = String(raw).trim();
  if (!str) return "";

  // Common Indian patterns: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
    }
  }

  // ISO pattern: YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
    }
  }

  // Fallback to JS Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, "0");
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return str;
}

export function parseDateToTime(raw: string | number | Date | null | undefined): number {
  if (!raw) return 0;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? 0 : raw.getTime();
  if (typeof raw === "number") return raw;

  const str = String(raw).trim();
  if (!str) return 0;

  // Indian format: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day).getTime();
  }

  // ISO format: YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day).getTime();
  }

  const fallback = new Date(str).getTime();
  return isNaN(fallback) ? 0 : fallback;
}
