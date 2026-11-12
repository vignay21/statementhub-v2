import { Transaction } from "@/types/transaction";

/**
 * Identify internal transfers between user's accounts:
 * STRICT RULE: A transaction is ONLY marked as Contra if the exact same UTR
 * appears as a double (both Credit and Debit) across different bank accounts.
 * Keyword-based guessing has been removed to prevent false positives and balance mismatches.
 */
export function detectContraTransfers(transactions: Transaction[]): boolean[] {
  const result: boolean[] = new Array(transactions.length).fill(false);

  // Index UTRs across banks to find cross-bank movements
  const utrGroups = new Map<string, { banks: Set<string>; hasCredit: boolean; hasDebit: boolean }>();

  transactions.forEach((t) => {
    const utr = (t.utr || "").trim().toUpperCase();
    // Ignore empty, placeholder, or short invalid identifiers (< 5 chars)
    if (!utr || utr === "-" || utr === "NA" || utr.length < 5) return;

    if (!utrGroups.has(utr)) {
      utrGroups.set(utr, { banks: new Set(), hasCredit: false, hasDebit: false });
    }
    const group = utrGroups.get(utr)!;
    if (t.bank) group.banks.add(t.bank.trim().toLowerCase());
    if (t.type === "Credit") group.hasCredit = true;
    if (t.type === "Debit") group.hasDebit = true;
  });

  const contraUTRs = new Set<string>();
  utrGroups.forEach((val, utr) => {
    // Only flag cross-bank transfers between different user accounts with the same UTR (double UTR)
    if (val.banks.size > 1 && val.hasCredit && val.hasDebit) {
      contraUTRs.add(utr);
    }
  });

  transactions.forEach((t, idx) => {
    const utr = (t.utr || "").trim().toUpperCase();
    if (utr && contraUTRs.has(utr)) {
      result[idx] = true;
    }
  });

  return result;
}
