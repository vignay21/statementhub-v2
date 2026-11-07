import { Transaction } from "@/types/transaction";

/**
 * Identify Fixed Deposits, Term Deposits, FD Redemptions, and Capital Investments.
 */
export function detectFixedDeposits(transactions: Transaction[]): boolean[] {
  const result: boolean[] = new Array(transactions.length).fill(false);

  const fdPartyRegex = /\b(fd|fixed deposit|term deposit|investment|digitalfd|fd redemption|td redemption)\b/i;
  const fdDescRegex =
    /\b(digitalfd|fixed deposit|term deposit|fd through|fd renew|fd clos|td renew|td clos|auto_redeem|prin and int|auto_sweep)\b/i;

  transactions.forEach((t, idx) => {
    if (t.party_name && fdPartyRegex.test(t.party_name)) {
      result[idx] = true;
      return;
    }

    if (t.description && fdDescRegex.test(t.description)) {
      result[idx] = true;
      return;
    }
  });

  return result;
}
