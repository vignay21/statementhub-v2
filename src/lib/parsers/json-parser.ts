import { ImportedStatement } from "@/types/statement";
import { Transaction } from "@/types/transaction";
import { computeFingerprint } from "../business/fingerprint";
import { normalizeDate } from "../formatters/date";
import { parseAmount } from "./amount-parser";

export async function parseJSONStatement(file: File): Promise<ImportedStatement> {
  const text = await file.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`File ${file.name} contains invalid JSON syntax.`);
  }

  let rawList: any[] = [];
  if (Array.isArray(json)) {
    rawList = json;
  } else if (json && typeof json === "object") {
    if (Array.isArray(json.transactions)) rawList = json.transactions;
    else if (Array.isArray(json.data)) rawList = json.data;
    else if (Array.isArray(json.rows)) rawList = json.rows;
    else if (Array.isArray(json.items)) rawList = json.items;
    else {
      rawList = Object.values(json).filter((v) => v && typeof v === "object");
    }
  }

  const transactions: Transaction[] = [];
  for (const t of rawList) {
    if (!t || typeof t !== "object") continue;

    const rawDate = t.date || t.Date || t.txn_date || t.transaction_date || "";
    const date = normalizeDate(rawDate);
    if (!date) continue;

    const parsedAmt = parseAmount(t.amount !== undefined ? t.amount : (t.Amount || 0));
    const amount = parsedAmt.amount;

    let type: "Credit" | "Debit" = "Credit";
    if (t.type === "Debit" || t.type === "DR" || t.type === "dr") {
      type = "Debit";
    } else if (t.type === "Credit" || t.type === "CR" || t.type === "cr") {
      type = "Credit";
    } else if (parsedAmt.raw < 0) {
      type = "Debit";
    }

    const bank = String(t.bank || t.Bank || "Other Bank").trim();
    const description = String(t.description || t.Description || t.narration || t.particulars || "").trim();
    const utr = String(t.utr || t.UTR || t.ref || t.reference || "").trim();
    const party_name = String(t.party_name || t.party || "").trim();
    const balance =
      t.balance !== undefined && t.balance !== null && !isNaN(Number(t.balance))
        ? Number(t.balance)
        : null;
    const party_match_key = String(t.party_match_key || "").trim();

    let fingerprint = String(t.fingerprint || "").trim();
    if (!fingerprint) {
      fingerprint = await computeFingerprint(bank, date, amount, type, utr, description, balance);
    }

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
      source_file: file.name,
    });
  }

  return {
    filename: file.name,
    bank: transactions[0]?.bank || "Imported JSON",
    transactions,
    original_columns: ["date", "description", "amount", "type", "utr", "bank"],
    skipped_rows: Math.max(0, rawList.length - transactions.length),
  };
}
