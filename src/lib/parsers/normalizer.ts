import { Transaction } from "@/types/transaction";
import { ColumnMap } from "./column-mapper";
import { normalizeDate } from "../formatters/date";
import { parseAmount } from "./amount-parser";
import { extractIdentifier } from "./utr-extractor";
import { cleanUTR } from "../business/utr-refiner";
import { extractPartyMatchKey } from "../business/party-match-key";
import { resolvePartyName } from "../business/party-resolver";
import { computeFingerprint } from "../business/fingerprint";

export async function normalizeStatementRows(
  rows: unknown[][],
  columnMap: ColumnMap,
  bank: string,
  filename: string,
  startRowIndex: number = 0
): Promise<Transaction[]> {
  const transactions: Transaction[] = [];

  for (let i = startRowIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawDate = columnMap.dateCol >= 0 ? (row[columnMap.dateCol] as any) : "";
    const date = normalizeDate(rawDate);
    if (!date) continue; // Skip non-transaction rows

    const description = (
      columnMap.descCol >= 0 ? String(row[columnMap.descCol] || "") : ""
    ).trim();

    // Determine Debit / Credit & Amount
    const debitRes =
      columnMap.debitCol >= 0 ? parseAmount(row[columnMap.debitCol] as any) : { amount: 0, raw: 0 };
    const creditRes =
      columnMap.creditCol >= 0 ? parseAmount(row[columnMap.creditCol] as any) : { amount: 0, raw: 0 };

    let amount = 0;
    let type: "Credit" | "Debit" = "Debit";

    if (creditRes.amount > 0 && debitRes.amount === 0) {
      amount = creditRes.amount;
      type = "Credit";
    } else if (debitRes.amount > 0 && creditRes.amount === 0) {
      amount = debitRes.amount;
      type = "Debit";
    } else if (creditRes.amount > 0) {
      amount = creditRes.amount;
      type = "Credit";
    } else if (debitRes.amount > 0) {
      amount = debitRes.amount;
      type = "Debit";
    } else {
      // Amount was 0 or unparseable, skip
      continue;
    }

    // Extract reference
    const rawRef = columnMap.refCol >= 0 ? String(row[columnMap.refCol] || "").trim() : "";
    const rawExtracted = extractIdentifier(description, rawRef);
    const utr = cleanUTR(description, rawExtracted);

    // Closing Balance
    let balance: number | null = null;
    if (columnMap.balanceCol >= 0 && row[columnMap.balanceCol] !== undefined && row[columnMap.balanceCol] !== "") {
      const bRes = parseAmount(row[columnMap.balanceCol] as any);
      if (bRes.amount > 0 || String(row[columnMap.balanceCol]).includes("0")) {
        balance = bRes.raw;
      }
    }

    const party_match_key = extractPartyMatchKey(description);
    const party_name = resolvePartyName(description, party_match_key);
    const fingerprint = await computeFingerprint(bank, date, amount, type, utr, description, balance);

    transactions.push({
      fingerprint,
      bank,
      date,
      description,
      party_name,
      amount,
      type,
      utr,
      balance,
      party_match_key,
      source_file: filename,
    });
  }

  return transactions;
}
