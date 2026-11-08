import { HEADER_ALIASES } from "../constants";
import { matchesHeaderAlias } from "./column-mapper";

/**
 * Detect the table header row by matching cell text against alias sets.
 * Requires at least 3 matches (date + description + amount/reference).
 */
export function findHeaderRow(rows: unknown[][]): {
  headerIndex: number;
  headerRow: string[];
  skippedRows: number;
} {
  let bestIndex = -1;
  let bestScore = 0;
  let bestRow: string[] = [];

  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i] || [];
    const normalizedCells = row.map((cell) => (cell !== null && cell !== undefined ? String(cell) : "").trim().toLowerCase());

    let score = 0;
    const matchedCategories = new Set<string>();

    for (const cell of normalizedCells) {
      if (!cell) continue;

      for (const [category, aliases] of Object.entries(HEADER_ALIASES)) {
        if (aliases.some((alias) => matchesHeaderAlias(cell, alias))) {
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
      bestRow = row.map((c) => (c !== null && c !== undefined ? String(c) : ""));
    }
  }

  return {
    headerIndex: bestIndex,
    headerRow: bestRow,
    skippedRows: bestIndex >= 0 ? bestIndex : 0,
  };
}
