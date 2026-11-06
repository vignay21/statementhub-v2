import { SupabaseClient } from "@supabase/supabase-js";

export interface StorageStats {
  usedBytes: number;
  usedMB: number;
  totalMB: number;
  freeMB: number;
  usedPercentage: number;
  totalRecords: number;
  remainingCapacity: number;
}

export async function fetchStorageStats(client: SupabaseClient): Promise<StorageStats> {
  const totalMB = 500; // Free tier 500 MB quota
  let usedBytes = 0;
  let totalRecords = 0;

  try {
    // 1. Try custom RPC get_storage_stats
    const { data: rpcData, error: rpcErr } = await client.rpc("get_storage_stats");
    if (!rpcErr && rpcData && typeof rpcData.total_bytes === "number") {
      usedBytes = rpcData.total_bytes;
      totalRecords = rpcData.total_records || 0;
    } else {
      // 2. Fallback: Count rows and estimate ~740 bytes/row with B-tree indexes
      const { count, error: countErr } = await client
        .from("transactions")
        .select("id", { count: "exact", head: true });

      totalRecords = !countErr && count !== null ? count : 0;
      usedBytes = totalRecords * 740;
    }
  } catch (e) {
    usedBytes = 0;
  }

  const usedMB = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;
  const freeMB = Math.max(0, Math.round((totalMB - usedMB) * 100) / 100);
  const usedPercentage = Math.min(100, Math.round((usedMB / totalMB) * 1000) / 10);
  const avgRecordBytes = 740;
  const remainingCapacity = Math.floor((freeMB * 1024 * 1024) / avgRecordBytes);

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
