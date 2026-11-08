import { HEADER_ALIASES } from "../constants";

export interface ColumnMap {
  dateCol: number;
  descCol: number;
  refCol: number;
  debitCol: number;
  creditCol: number;
  balanceCol: number;
}

/**
 * Q10 fix: Word boundary check to prevent false positives like
 * "date" matching "updated", or "dr" matching "address"
 */
export function matchesHeaderAlias(cell: string, alias: string): boolean {
  if (!cell || !alias) return false;
  if (cell === alias) return true;
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return regex.test(cell);
}

export function mapColumns(headers: string[]): ColumnMap {
  const result: ColumnMap = {
    dateCol: -1,
    descCol: -1,
    refCol: -1,
    debitCol: -1,
    creditCol: -1,
    balanceCol: -1,
  };

  headers.forEach((h, idx) => {
    const clean = (h || "").trim().toLowerCase();
    if (!clean) return;

    if (result.dateCol === -1 && HEADER_ALIASES.date.some((a) => matchesHeaderAlias(clean, a))) {
      result.dateCol = idx;
    } else if (result.descCol === -1 && HEADER_ALIASES.description.some((a) => matchesHeaderAlias(clean, a))) {
      result.descCol = idx;
    } else if (result.refCol === -1 && HEADER_ALIASES.reference.some((a) => matchesHeaderAlias(clean, a))) {
      result.refCol = idx;
    } else if (result.debitCol === -1 && HEADER_ALIASES.debit.some((a) => matchesHeaderAlias(clean, a))) {
      result.debitCol = idx;
    } else if (result.creditCol === -1 && HEADER_ALIASES.credit.some((a) => matchesHeaderAlias(clean, a))) {
      result.creditCol = idx;
    } else if (result.balanceCol === -1 && HEADER_ALIASES.balance.some((a) => matchesHeaderAlias(clean, a))) {
      result.balanceCol = idx;
    }
  });

  return result;
}
