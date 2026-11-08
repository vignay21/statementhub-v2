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

  // Common pattern: DD-Mon-YYYY or DD Mon YYYY (e.g. 25-Apr-2024 or 25 Apr 24)
  const dMonYMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})/);
  if (dMonYMatch) {
    const day = parseInt(dMonYMatch[1], 10);
    const monthStr = dMonYMatch[2].toLowerCase().slice(0, 3);
    let year = parseInt(dMonYMatch[3], 10);
    if (year < 100) year += 2000;
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const mIdx = months.indexOf(monthStr);
    if (mIdx !== -1 && day >= 1 && day <= 31) {
      return `${String(day).padStart(2, "0")}-${String(mIdx + 1).padStart(2, "0")}-${year}`;
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

  // Fallback to JS Date parser ONLY IF the string explicitly contains a 4-digit year
  // (Prevents strings like "Apr 25" or "Opening Balance" from falsely producing 2001 dates)
  if (/\b(19\d\d|20\d\d)\b/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const d = String(parsed.getDate()).padStart(2, "0");
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const y = parsed.getFullYear();
      return `${d}-${m}-${y}`;
    }
  }

  // B3 fix: Always return empty string when date parsing fails
  return "";
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
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  const dMonYMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})/);
  if (dMonYMatch) {
    const day = parseInt(dMonYMatch[1], 10);
    const monthStr = dMonYMatch[2].toLowerCase().slice(0, 3);
    let year = parseInt(dMonYMatch[3], 10);
    if (year < 100) year += 2000;
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const mIdx = months.indexOf(monthStr);
    if (mIdx !== -1) {
      const d = new Date(year, mIdx, day);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
