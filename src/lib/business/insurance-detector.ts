import { Transaction } from "@/types/transaction";

/**
 * Identify personal insurance claims, policy maturity payouts, annuity settlements, and premiums.
 * Excludes normal software licenses like Marg Lic.
 */
export function detectInsuranceClaims(transactions: Transaction[]): boolean[] {
  const result: boolean[] = new Array(transactions.length).fill(false);

  const insurancePartyRegex = /\b(insurance|insurance claim|lic|icici prudential|shriram life)\b/i;
  const insuranceDescRegex =
    /\b(lic210p|lic of india|shriram life|icici prudential|prudential life|health insurance|life insurance)\b/i;

  transactions.forEach((t, idx) => {
    // 1. Direct match on party name
    if (t.party_name && insurancePartyRegex.test(t.party_name.trim())) {
      result[idx] = true;
      return;
    }

    // 2. Narration match (ensure it is not a software license like "Marg Lic")
    const desc = t.description || "";
    if (insuranceDescRegex.test(desc)) {
      result[idx] = true;
      return;
    }

    // 3. LIC in description as standalone token (e.g. "LIC PREMIUM")
    if (/\blic\b/i.test(desc) && !/marg lic|software lic|license|licence/i.test(desc)) {
      result[idx] = true;
      return;
    }
  });

  return result;
}
