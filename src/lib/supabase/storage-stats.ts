import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

export interface StorageStats {
  usedBytes: number;
  usedMB: number;
  totalMB: number;
  freeMB: number;
  usedPercentage: number;
  totalRecords: number;
  remainingCapacity: number;
}

// Q8 fix: Named constants instead of magic numbers
export const ESTIMATED_BYTES_PER_ROW = 740;
export const DEFAULT_FREE_TIER_STORAGE_MB = 500;

export async function fetchStorageStats(
  client: SupabaseClient<Database> | SupabaseClient
): Promise<StorageStats> {
  const totalMB = DEFAULT_FREE_TIER_STORAGE_MB;
  let usedBytes = 0;
  let totalRecords = 0;

  try {
    // 1. Try custom RPC get_storage_stats if available
    const { data: rpcData, error: rpcErr } = await (client as any).rpc("get_storage_stats");
    if (!rpcErr && rpcData && typeof rpcData.total_bytes === "number") {
      usedBytes = rpcData.total_bytes;
      totalRecords = rpcData.total_records || 0;
    } else {
      // 2. Fallback: Count rows and estimate using average indexed record size
      const { count, error: countErr } = await (client as any)
        .from("transactions")
        .select("id", { count: "exact", head: true });

      totalRecords = !countErr && count !== null ? count : 0;
      usedBytes = totalRecords * ESTIMATED_BYTES_PER_ROW;
    }
  } catch (err: unknown) {
    console.warn("Notice: Failed to fetch storage stats, using zero baseline:", err);
    usedBytes = 0;
  }

  const usedMB = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;
  const freeMB = Math.max(0, Math.round((totalMB - usedMB) * 100) / 100);
  const usedPercentage = Math.min(100, Math.round((usedMB / totalMB) * 1000) / 10);
  const remainingCapacity = Math.floor((freeMB * 1024 * 1024) / ESTIMATED_BYTES_PER_ROW);

  return {
    usedBytes,
    usedMB,
    totalMB,
    freeMB,
    usedPercentage,
    totalRecords,
    remainingCapacity,
  };
}
