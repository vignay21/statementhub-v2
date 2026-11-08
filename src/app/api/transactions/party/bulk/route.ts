import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { bulkUpdateTransactionParties } from "@/lib/supabase/transactions";
import { savePartyNameInDB, savePartyMappingInDB } from "@/lib/supabase/party-mappings";

export async function POST(req: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
    }

    const body = await req.json();
    const updates: Array<{ fingerprint?: string; match_key?: string; party_name: string }> =
      Array.isArray(body) ? body : body?.updates || [];

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: true, updatedCount: 0 });
    }

    // 1. Collect distinct party names and persist to party directory
    const uniqueParties = new Set<string>();
    for (const u of updates) {
      if (u.party_name && u.party_name.trim()) {
        uniqueParties.add(u.party_name.trim());
      }
    }
    await Promise.all(
      Array.from(uniqueParties).map((name) => savePartyNameInDB(client, name))
    );

    // 2. Persist any match_key mappings
    for (const u of updates) {
      if (u.match_key && u.party_name) {
        await savePartyMappingInDB(client, u.match_key, u.party_name);
      }
    }

    // 3. Perform bulk update on transactions
    const result = await bulkUpdateTransactionParties(client, updates);

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      errors: result.errors,
    });
  } catch (err: unknown) {
    console.error("API /transactions/party/bulk error:", err);
    const message = err instanceof Error ? err.message : "Failed to bulk update parties";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

