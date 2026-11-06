import { Transaction } from "@/types/transaction";

export interface DedupCheckResult {
  newTransactions: Transaction[];
  duplicateCount: number;
  duplicateFingerprints: Set<string>;
}

export function deduplicateTransactions(
  incoming: Transaction[],
  existing: Transaction[]
): DedupCheckResult {
  const existingFingerprints = new Set<string>();
  const existingUtrKeys = new Set<string>();
  const existingBalKeys = new Set<string>();

  existing.forEach((t) => {
    if (t.fingerprint) existingFingerprints.add(t.fingerprint);

    if (t.utr && t.utr.trim()) {
      const key = `${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${t.utr.trim().toUpperCase()}`;
      existingUtrKeys.add(key);
    }

    if (t.balance !== null && t.balance !== undefined) {
      const key = `${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${Number(t.balance).toFixed(2)}`;
      existingBalKeys.add(key);
    }
  });

  const newTransactions: Transaction[] = [];
  const duplicateFingerprints = new Set<string>();
  let duplicateCount = 0;

  for (const t of incoming) {
    let isDupe = false;

    // Layer 1: Fingerprint match
    if (existingFingerprints.has(t.fingerprint)) {
      isDupe = true;
    }

    // Layer 2: UTR signature match
    if (!isDupe && t.utr && t.utr.trim()) {
      const utrKey = `${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${t.utr.trim().toUpperCase()}`;
      if (existingUtrKeys.has(utrKey)) {
        isDupe = true;
      }
    }

    // Layer 3: Balance signature match
    if (!isDupe && t.balance !== null && t.balance !== undefined) {
      const balKey = `${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${Number(t.balance).toFixed(2)}`;
      if (existingBalKeys.has(balKey)) {
        isDupe = true;
      }
    }

    if (isDupe) {
      duplicateCount++;
      duplicateFingerprints.add(t.fingerprint);
    } else {
      newTransactions.push(t);
      // Register in current batch to avoid self-duplicates
      existingFingerprints.add(t.fingerprint);
      if (t.utr && t.utr.trim()) {
        existingUtrKeys.add(`${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${t.utr.trim().toUpperCase()}`);
      }
      if (t.balance !== null && t.balance !== undefined) {
        existingBalKeys.add(`${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${Number(t.balance).toFixed(2)}`);
      }
    }
  }

  return {
    newTransactions,
    duplicateCount,
    duplicateFingerprints,
  };
}
