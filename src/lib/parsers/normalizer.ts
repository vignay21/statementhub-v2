import { Transaction } from "@/types/transaction";
import { ColumnMap } from "./column-mapper";
import { normalizeDate } from "../formatters/date";
import { parseAmount } from "./amount-parser";
import { extractIdentifier, isIFSCCode } from "./utr-extractor";
import { extractPartyMatchKey } from "../business/party-match-key";
import { computeFingerprint } from "../business/fingerprint";

export async function normalizeStatementRows(
  rows: any[][],
  columnMap: ColumnMap,
  bank: string,
  filename: string,
  startRowIndex: number = 0
): Promise<Transaction[]> {
  const transactions: Transaction[] = [];

  for (let i = startRowIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawDate = columnMap.dateCol >= 0 ? row[columnMap.dateCol] : "";
    const date = normalizeDate(rawDate);
    if (!date) continue; // Skip non-transaction rows

    const description = (
      columnMap.descCol >= 0 ? String(row[columnMap.descCol] || "") : ""
    ).trim();

    // Determine Debit / Credit & Amount
    const debitRes =
      columnMap.debitCol >= 0 ? parseAmount(row[columnMap.debitCol]) : { amount: 0, raw: 0 };
    const creditRes =
      columnMap.creditCol >= 0 ? parseAmount(row[columnMap.creditCol]) : { amount: 0, raw: 0 };

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
    let utr = extractIdentifier(description, rawRef);
    if (isIFSCCode(utr)) {
      utr = "";
    }

    // Closing Balance
    let balance: number | null = null;
    if (columnMap.balanceCol >= 0 && row[columnMap.balanceCol] !== undefined && row[columnMap.balanceCol] !== "") {
      const balRes = parseAmount(row[columnMap.balanceCol]);
      balance = balRes.raw;
    }

    const partyMatchKey = extractPartyMatchKey(description);
    const fingerprint = await computeFingerprint(
      bank,
      date,
      amount,
      type,
      utr,
      description,
      balance
    );

    transactions.push({
      fingerprint,
      bank,
      date,
      description,
      party_name: "",
      amount,
      type,
      utr,
      balance,
      party_match_key: partyMatchKey,
      source_file: filename,
    });
  }

  return transactions;
}
