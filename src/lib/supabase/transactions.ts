import { SupabaseClient } from "@supabase/supabase-js";
import { Transaction } from "@/types/transaction";
import { deduplicateTransactions } from "../business/deduplication";

export async function fetchTransactionsFromDB(
  client: SupabaseClient,
  limit: number = 50000
): Promise<Transaction[]> {
  const pageSize = 1000;
  let allRows: any[] = [];
  let from = 0;

  while (from < limit) {
    const to = Math.min(from + pageSize - 1, limit - 1);
    const { data, error } = await client
      .from("transactions")
      .select("*")
      .order("id", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching transactions:", error);
      break;
    }

    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows.map((r) => ({
    id: r.id,
    fingerprint: r.fingerprint,
    bank: r.bank,
    date: r.date,
    description: r.description,
    party_name: r.party_name || "",
    amount: Number(r.amount),
    type: r.type as "Credit" | "Debit",
    utr: r.utr || "",
    balance: r.balance !== null ? Number(r.balance) : null,
    party_match_key: r.party_match_key || "",
    source_file: r.source_file || "",
    created_at: r.created_at,
  }));
}

export async function syncTransactionsWithDB(
  client: SupabaseClient,
  incoming: Transaction[]
): Promise<{ inserted: number; skipped: number; total: number }> {
  if (incoming.length === 0) {
    return { inserted: 0, skipped: 0, total: 0 };
  }

  // 1. Fetch existing fingerprints and signatures to perform 3-layer dedup
  const existing = await fetchTransactionsFromDB(client);
  const dedupResult = deduplicateTransactions(incoming, existing);

  const toInsert = dedupResult.newTransactions;
  const skipped = dedupResult.duplicateCount;

  // 2. Insert in chunks of 100
  const chunkSize = 100;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize).map((t) => ({
      fingerprint: t.fingerprint,
      bank: t.bank,
      date: t.date,
      description: t.description,
      party_name: t.party_name || "",
      amount: t.amount,
      type: t.type,
      utr: t.utr || "",
      balance: t.balance,
      party_match_key: t.party_match_key,
      source_file: t.source_file || "",
    }));

    const { error } = await client.from("transactions").upsert(chunk, {
      onConflict: "fingerprint",
      ignoreDuplicates: true,
    });

    if (error) {
      console.error("Error inserting transaction batch:", error);
    } else {
      inserted += chunk.length;
    }
  }

  return {
    inserted,
    skipped,
    total: incoming.length,
  };
}

export async function updateTransactionPartyName(
  client: SupabaseClient,
  fingerprint: string,
  partyName: string
): Promise<boolean> {
  const { error } = await client
    .from("transactions")
    .update({ party_name: partyName })
    .eq("fingerprint", fingerprint);

  if (error) {
    console.error("Error updating transaction party:", error);
    return false;
  }
  return true;
}

export async function bulkUpdateTransactionPartyByMatchKey(
  client: SupabaseClient,
  matchKey: string,
  partyName: string
): Promise<number> {
  const { data, error } = await client
    .from("transactions")
    .update({ party_name: partyName })
    .eq("party_match_key", matchKey)
    .select("id");

  if (error) {
    console.error("Error bulk updating by match key:", error);
    return 0;
  }
  return data?.length || 0;
}
