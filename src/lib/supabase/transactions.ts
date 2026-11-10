import { SupabaseClient } from "@supabase/supabase-js";
import { Transaction } from "@/types/transaction";
import { deduplicateTransactions } from "../business/deduplication";
import { extractPartyMatchKey } from "../business/party-match-key";
import { resolvePartyName } from "../business/party-resolver";
import { fetchPartyMappingsFromDB } from "./party-mappings";
import { Database } from "./types";

export interface SyncResult {
  inserted: number;
  skipped: number;
  total: number;
  errors?: string[];
}

/**
 * Fetch full transaction records with pagination.
 * Note: Supabase PostgREST caps at 1000 rows per request, so pageSize=1000 ensures full pagination across all records.
 */
export async function fetchTransactionsFromDB(
  client: SupabaseClient<Database> | SupabaseClient,
  limit: number = 50000
): Promise<Transaction[]> {
  const pageSize = 1000;
  let allRows: any[] = [];
  let from = 0;

  while (from < limit) {
    const to = Math.min(from + pageSize - 1, limit - 1);
    const { data, error } = await (client as any)
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
    balance: r.balance !== null && r.balance !== undefined ? Number(r.balance) : null,
    party_match_key: r.party_match_key || "",
    source_file: r.source_file || "",
    created_at: r.created_at,
  }));
}

/**
 * Lightweight query fetching deduplication signatures across all records with 1000-row pagination.
 */
export async function fetchDedupSignaturesFromDB(
  client: SupabaseClient<Database> | SupabaseClient,
  limit: number = 50000
): Promise<Transaction[]> {
  const pageSize = 1000;
  let allRows: any[] = [];
  let from = 0;

  while (from < limit) {
    const to = Math.min(from + pageSize - 1, limit - 1);
    const { data, error } = await (client as any)
      .from("transactions")
      .select("fingerprint, bank, date, amount, type, utr, balance, description")
      .order("id", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching dedup signatures from DB:", error);
      break;
    }

    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows.map((r) => ({
    fingerprint: r.fingerprint,
    bank: r.bank,
    date: r.date,
    description: r.description || "",
    party_name: "",
    amount: Number(r.amount),
    type: r.type as "Credit" | "Debit",
    utr: r.utr || "",
    balance: r.balance !== null && r.balance !== undefined ? Number(r.balance) : null,
    party_match_key: "",
    source_file: "",
  }));
}

export async function syncTransactionsWithDB(
  client: SupabaseClient<Database> | SupabaseClient,
  incoming: Transaction[]
): Promise<SyncResult> {
  if (incoming.length === 0) {
    return { inserted: 0, skipped: 0, total: 0 };
  }

  // 1. Fetch only lightweight deduplication signatures instead of entire DB payload
  const existing = await fetchDedupSignaturesFromDB(client);
  const dedupResult = deduplicateTransactions(incoming, existing);

  const toInsert = dedupResult.newTransactions;
  const skipped = dedupResult.duplicateCount;

  // 2. Fetch party mappings to automatically resolve party names for unassigned transactions
  let mappingMap: Map<string, string> | undefined;
  try {
    const mappings = await fetchPartyMappingsFromDB(client);
    if (mappings && mappings.length > 0) {
      mappingMap = new Map<string, string>();
      for (const m of mappings) {
        if (m.match_key && m.party_name) {
          mappingMap.set(m.match_key.trim().toUpperCase(), m.party_name.trim());
        }
      }
    }
  } catch (err) {
    console.warn("Notice: Could not fetch party mappings for auto-assignment:", err);
  }

  // 3. Insert in chunks of 100
  const chunkSize = 100;
  let inserted = 0;
  const chunkErrors: string[] = [];

  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize).map((t) => {
      const matchKey = t.party_match_key || extractPartyMatchKey(t.description);
      const partyName = t.party_name || resolvePartyName(t.description, matchKey, mappingMap);

      return {
        fingerprint: t.fingerprint,
        bank: t.bank,
        date: t.date,
        description: t.description,
        party_name: partyName || "",
        amount: t.amount,
        type: t.type,
        utr: t.utr || "",
        balance: t.balance,
        party_match_key: matchKey || "",
        source_file: t.source_file || "",
      };
    });

    const { error } = await (client as any).from("transactions").upsert(chunk, {
      onConflict: "fingerprint",
      ignoreDuplicates: true,
    });

    if (error) {
      console.error("Error inserting transaction batch:", error);
      chunkErrors.push(error.message || "Batch insert error");
    } else {
      inserted += chunk.length;
    }
  }

  return {
    inserted,
    skipped,
    total: incoming.length,
    ...(chunkErrors.length > 0 ? { errors: chunkErrors } : {}),
  };
}

export async function updateTransactionPartyName(
  client: SupabaseClient<Database> | SupabaseClient,
  fingerprint: string,
  partyName: string
): Promise<boolean> {
  const { error } = await (client as any)
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
  client: SupabaseClient<Database> | SupabaseClient,
  matchKey: string,
  partyName: string
): Promise<number> {
  const { data, error } = await (client as any)
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

/**
 * P2 fix: Bulk update multiple transactions / match keys in a single operation.
 */
export async function bulkUpdateTransactionParties(
  client: SupabaseClient<Database> | SupabaseClient,
  updates: Array<{ fingerprint?: string; match_key?: string; party_name: string }>
): Promise<{ updatedCount: number; errors?: string[] }> {
  let updatedCount = 0;
  const errors: string[] = [];

  for (const item of updates) {
    if (!item.party_name) continue;

    if (item.fingerprint) {
      const { error } = await (client as any)
        .from("transactions")
        .update({ party_name: item.party_name })
        .eq("fingerprint", item.fingerprint);

      if (error) {
        errors.push(`Fingerprint ${item.fingerprint}: ${error.message}`);
      } else {
        updatedCount += 1;
      }
    } else if (item.match_key) {
      const { data, error } = await (client as any)
        .from("transactions")
        .update({ party_name: item.party_name })
        .eq("party_match_key", item.match_key)
        .select("id");

      if (error) {
        errors.push(`MatchKey ${item.match_key}: ${error.message}`);
      } else {
        updatedCount += data?.length || 0;
      }
    }
  }

  return {
    updatedCount,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
