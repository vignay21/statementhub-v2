import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { syncTransactionsWithDB } from "@/lib/supabase/transactions";
import { savePartyNameInDB, savePartyMappingInDB } from "@/lib/supabase/party-mappings";

export async function POST(req: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const backup = await req.json();
    const storedParties: string[] = backup.stored_parties || [];
    const partyMappings: any[] = backup.party_mappings || [];
    const transactions: any[] = backup.transactions || [];

    // 1. Restore stored parties
    for (const name of storedParties) {
      await savePartyNameInDB(client, name);
    }

    // 2. Restore party mappings
    for (const mapping of partyMappings) {
      if (mapping.match_key && mapping.party_name) {
        await savePartyMappingInDB(client, mapping.match_key, mapping.party_name);
      }
    }

    // 3. Restore transactions with dedup
    const result = await syncTransactionsWithDB(client, transactions);

    return NextResponse.json({
      success: true,
      restoredParties: storedParties.length,
      restoredMappings: partyMappings.length,
      transactionsResult: result,
    });
  } catch (err: any) {
    console.error("API /backup/import error:", err);
    return NextResponse.json({ error: err.message || "Failed to import backup" }, { status: 500 });
  }
}
