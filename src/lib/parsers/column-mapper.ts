import { HEADER_ALIASES } from "../constants";

export interface ColumnMap {
  dateCol: number;
  descCol: number;
  refCol: number;
  debitCol: number;
  creditCol: number;
  balanceCol: number;
  typeCol?: number;
  amountCol?: number;
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
    typeCol: -1,
    amountCol: -1,
  };

  headers.forEach((h, idx) => {
    const clean = (h || "").trim().toLowerCase();
    if (!clean) return;

    // Check Type column first (e.g. Cr/Dr, Type) to prevent false positive matching to debit or credit
    if (result.typeCol === -1 && HEADER_ALIASES.type.some((a) => matchesHeaderAlias(clean, a))) {
      result.typeCol = idx;
      return;
    }

    // Check Amount column (e.g. Transaction Amount(INR), Amount)
    if (result.amountCol === -1 && HEADER_ALIASES.amount.some((a) => matchesHeaderAlias(clean, a))) {
      result.amountCol = idx;
      return;
    }

    if (result.dateCol === -1 && HEADER_ALIASES.date.some((a) => matchesHeaderAlias(clean, a))) {
      result.dateCol = idx;
      return;
    }

    if (result.descCol === -1 && HEADER_ALIASES.description.some((a) => matchesHeaderAlias(clean, a))) {
      result.descCol = idx;
      return;
    }

    if (result.refCol === -1 && HEADER_ALIASES.reference.some((a) => matchesHeaderAlias(clean, a))) {
      result.refCol = idx;
      return;
    }

    // Only match pure debit / credit if not a combined indicator like "cr/dr"
    const isCrDr = (clean.includes("cr") && clean.includes("dr")) || clean.includes("type");
    if (!isCrDr) {
      if (result.debitCol === -1 && HEADER_ALIASES.debit.some((a) => matchesHeaderAlias(clean, a))) {
        result.debitCol = idx;
        return;
      }
      if (result.creditCol === -1 && HEADER_ALIASES.credit.some((a) => matchesHeaderAlias(clean, a))) {
        result.creditCol = idx;
        return;
      }
    }

    if (result.balanceCol === -1 && HEADER_ALIASES.balance.some((a) => matchesHeaderAlias(clean, a))) {
      result.balanceCol = idx;
      return;
    }
  });

  return result;
}
