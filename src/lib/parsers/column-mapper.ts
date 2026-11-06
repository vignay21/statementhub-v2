import { HEADER_ALIASES } from "../constants";

export interface ColumnMap {
  dateCol: number;
  descCol: number;
  refCol: number;
  debitCol: number;
  creditCol: number;
  balanceCol: number;
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

    if (result.dateCol === -1 && HEADER_ALIASES.date.some((a) => clean === a || clean.includes(a))) {
      result.dateCol = idx;
    } else if (result.descCol === -1 && HEADER_ALIASES.description.some((a) => clean === a || clean.includes(a))) {
      result.descCol = idx;
    } else if (result.refCol === -1 && HEADER_ALIASES.reference.some((a) => clean === a || clean.includes(a))) {
      result.refCol = idx;
    } else if (result.debitCol === -1 && HEADER_ALIASES.debit.some((a) => clean === a || clean.includes(a))) {
      result.debitCol = idx;
    } else if (result.creditCol === -1 && HEADER_ALIASES.credit.some((a) => clean === a || clean.includes(a))) {
      result.creditCol = idx;
    } else if (result.balanceCol === -1 && HEADER_ALIASES.balance.some((a) => clean === a || clean.includes(a))) {
      result.balanceCol = idx;
    }
  });

  return result;
}
