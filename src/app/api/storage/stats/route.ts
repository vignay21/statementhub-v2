import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { fetchStorageStats } from "@/lib/supabase/storage-stats";

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({
        usedBytes: 0,
        usedMB: 0,
        totalMB: 500,
        freeMB: 500,
        usedPercentage: 0,
        totalRecords: 0,
        remainingCapacity: 600000,
      });
    }

    const stats = await fetchStorageStats(client);
    return NextResponse.json(stats);
  } catch (err: any) {
    console.error("API /storage/stats error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch storage stats" }, { status: 500 });
  }
}
