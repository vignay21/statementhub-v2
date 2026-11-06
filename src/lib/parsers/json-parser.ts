import { ImportedStatement } from "@/types/statement";
import { Transaction } from "@/types/transaction";
import { computeFingerprint } from "../business/fingerprint";
import { normalizeDate } from "../formatters/date";
import { parseAmount } from "./amount-parser";
import { extractPartyMatchKey } from "../business/party-match-key";
import { extractIdentifier, isIFSCCode } from "./utr-extractor";

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
    const description = String(
      t.description || t.Description || t.narration || t.particulars || ""
    ).trim();
    let utr = String(t.utr || t.UTR || t["UTR / Reference"] || t.ref || t.reference || "").trim();
    if (utr && isIFSCCode(utr)) {
      const fixed = extractIdentifier(description, "");
      utr = isIFSCCode(fixed) ? "" : fixed;
    }
    const party_name = String(
      t["Assigned Business / Party Name"] ||
      t.party_name ||
      t["Party Name"] ||
      t.party ||
      t.Party ||
      ""
    ).trim();
    const balance =
      t.balance !== undefined && t.balance !== null && !isNaN(Number(t.balance))
        ? Number(t.balance)
        : t.Balance !== undefined && t.Balance !== null && !isNaN(Number(t.Balance))
        ? Number(t.Balance)
        : null;
    const party_match_key =
      String(t["Party match key"] || t["Party Match Key"] || t.party_match_key || "").trim() ||
      extractPartyMatchKey(description);
    const source_file = String(
      t["Source file"] || t["Source File"] || t.source_file || file.name
    ).trim();

    let fingerprint = String(
      t.fingerprint || t["Transaction key"] || t["Transaction Key"] || ""
    ).trim();
    if (!fingerprint) {
      fingerprint = await computeFingerprint(bank, date, amount, type, utr, description, balance);
    }

    const is_self_transfer = Boolean(
      t.is_self_transfer ?? t["Is_Internal"] ?? t["Is Internal"] ?? false
    );
    const is_fd_investment = Boolean(
      t.is_fd_investment ?? t["Is_FD"] ?? t["Is FD"] ?? false
    );
    const is_duplicate_utr = Boolean(
      t.is_duplicate_utr ?? t["Duplicate UTR"] ?? false
    );

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
      source_file,
      is_self_transfer,
      is_fd_investment,
      is_duplicate_utr,
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
