import { Transaction } from "@/types/transaction";
import { cleanTransactionUTR } from "./utr-refiner";

function normalizeDesc(desc?: string): string {
  return (desc || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

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
  const existingExactTwinKeys = new Set<string>();
  const existingBalKeys = new Set<string>();

  // Pre-clean existing transactions to normalize any legacy IFSC UTRs
  const cleanedExisting = existing.map(cleanTransactionUTR);

  cleanedExisting.forEach((t) => {
    if (t.fingerprint) existingFingerprints.add(t.fingerprint);

    if (t.utr && t.utr.trim()) {
      const key = `${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${t.utr.trim().toUpperCase()}`;
      existingUtrKeys.add(key);
    }

    if (t.balance !== null && t.balance !== undefined) {
      const balKey = `${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${Number(t.balance).toFixed(2)}`;
      existingBalKeys.add(balKey);

      // Exact twin key: Bank + Date + Amount + Type + Balance + Normalized Description
      const twinKey = `${balKey}|${normalizeDesc(t.description)}`;
      existingExactTwinKeys.add(twinKey);
    }
  });

  const newTransactions: Transaction[] = [];
  const duplicateFingerprints = new Set<string>();
  let duplicateCount = 0;

  for (const rawT of incoming) {
    const t = cleanTransactionUTR(rawT);
    let isDupe = false;

    // Layer 1: Fingerprint match (SHA-256)
    if (existingFingerprints.has(t.fingerprint)) {
      isDupe = true;
    }

    // Layer 2: UTR signature match (Bank + Date + Amount + Type + UTR)
    if (!isDupe && t.utr && t.utr.trim()) {
      const utrKey = `${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${t.utr.trim().toUpperCase()}`;
      if (existingUtrKeys.has(utrKey)) {
        isDupe = true;
      }
    }

    // Layer 3: Exact twin match (Bank + Date + Amount + Type + Balance + Description)
    // Matches identical statement lines even if UTR or fingerprint differed across parser versions
    if (!isDupe && t.balance !== null && t.balance !== undefined) {
      const balKey = `${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${Number(t.balance).toFixed(2)}`;
      const twinKey = `${balKey}|${normalizeDesc(t.description)}`;
      if (existingExactTwinKeys.has(twinKey)) {
        isDupe = true;
      }
    }

    // Layer 4: Balance signature fallback (when UTR is missing/empty on incoming)
    if (!isDupe && (!t.utr || !t.utr.trim()) && t.balance !== null && t.balance !== undefined) {
      const balKey = `${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${Number(t.balance).toFixed(2)}`;
      if (existingBalKeys.has(balKey)) {
        console.warn(`[Dedup] Matched transaction by balance signature fallback: ${balKey}`);
        isDupe = true;
      }
    }

    if (isDupe) {
      duplicateCount++;
      duplicateFingerprints.add(t.fingerprint);
    } else {
      newTransactions.push(t);
      // Register in current batch to avoid self-duplicates within same file
      existingFingerprints.add(t.fingerprint);
      if (t.utr && t.utr.trim()) {
        existingUtrKeys.add(`${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${t.utr.trim().toUpperCase()}`);
      }
      if (t.balance !== null && t.balance !== undefined) {
        const balKey = `${t.bank}|${t.date}|${t.amount.toFixed(2)}|${t.type}|${Number(t.balance).toFixed(2)}`;
        existingBalKeys.add(balKey);
        existingExactTwinKeys.add(`${balKey}|${normalizeDesc(t.description)}`);
      }
    }
  }

  return {
    newTransactions,
    duplicateCount,
    duplicateFingerprints,
  };
}
