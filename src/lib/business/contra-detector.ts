import { Transaction } from "@/types/transaction";

/**
 * Identify internal transfers between user's accounts:
 * 1. Party Name contains self, contra, own account
 * 2. Same UTR appears as Credit in one bank and Debit in another
 * 3. Description contains contra keywords
 */
export function detectContraTransfers(transactions: Transaction[]): boolean[] {
  const result: boolean[] = new Array(transactions.length).fill(false);

  // Index UTRs across banks to find cross-bank movements
  const utrGroups = new Map<string, { banks: Set<string>; hasCredit: boolean; hasDebit: boolean }>();

  transactions.forEach((t) => {
    const utr = (t.utr || "").trim();
    if (!utr) return;

    if (!utrGroups.has(utr)) {
      utrGroups.set(utr, { banks: new Set(), hasCredit: false, hasDebit: false });
    }
    const group = utrGroups.get(utr)!;
    if (t.bank) group.banks.add(t.bank);
    if (t.type === "Credit") group.hasCredit = true;
    if (t.type === "Debit") group.hasDebit = true;
  });

  const contraUTRs = new Set<string>();
  utrGroups.forEach((val, utr) => {
    // Cross-bank or matched credit/debit with same UTR
    if ((val.banks.size > 1 && val.hasCredit && val.hasDebit) || (val.hasCredit && val.hasDebit)) {
      contraUTRs.add(utr);
    }
  });

  const contraRegex = /\b(self|contra|own account|self transfer|transfer to self|to own a\/c)\b/i;

  transactions.forEach((t, idx) => {
    // 1. Party name check
    if (t.party_name && contraRegex.test(t.party_name)) {
      result[idx] = true;
      return;
    }

    // 2. Cross-bank UTR check
    const utr = (t.utr || "").trim();
    if (utr && contraUTRs.has(utr)) {
      result[idx] = true;
      return;
    }

    // 3. Description check
    if (t.description && contraRegex.test(t.description)) {
      result[idx] = true;
      return;
    }
  });

  return result;
}
