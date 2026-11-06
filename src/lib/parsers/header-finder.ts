import { HEADER_ALIASES } from "../constants";

/**
 * Detect the table header row by matching cell text against alias sets.
 * Requires at least 3 matches (date + description + amount/reference).
 */
export function findHeaderRow(rows: string[][]): {
  headerIndex: number;
  headerRow: string[];
  skippedRows: number;
} {
  let bestIndex = -1;
  let bestScore = 0;
  let bestRow: string[] = [];

  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i] || [];
    const normalizedCells = row.map((cell) => (cell || "").toString().trim().toLowerCase());

    let score = 0;
    const matchedCategories = new Set<string>();

    for (const cell of normalizedCells) {
      if (!cell) continue;

      for (const [category, aliases] of Object.entries(HEADER_ALIASES)) {
        if (aliases.some((alias) => cell === alias || cell.includes(alias))) {
          matchedCategories.add(category);
        }
      }
    }

    score = matchedCategories.size;

    // Must have date + description + at least one debit/credit/balance/reference
    const hasDate = matchedCategories.has("date");
    const hasDesc = matchedCategories.has("description");
    const hasAmount =
      matchedCategories.has("debit") ||
      matchedCategories.has("credit") ||
      matchedCategories.has("reference");

    if (hasDate && hasDesc && hasAmount && score > bestScore) {
      bestScore = score;
      bestIndex = i;
      bestRow = row;
    }
  }

  return {
    headerIndex: bestIndex,
    headerRow: bestRow,
    skippedRows: bestIndex >= 0 ? bestIndex : 0,
  };
}
