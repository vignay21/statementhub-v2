import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import {
  updateTransactionPartyName,
  bulkUpdateTransactionPartyByMatchKey,
} from "@/lib/supabase/transactions";
import { savePartyNameInDB, savePartyMappingInDB } from "@/lib/supabase/party-mappings";

export async function PATCH(req: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
    }

    const body = await req.json();
    const { fingerprint, match_key, party_name } = body;

    if (!party_name) {
      return NextResponse.json({ error: "party_name is required." }, { status: 400 });
    }

    // Save in stored party names
    await savePartyNameInDB(client, party_name);

    if (fingerprint) {
      const ok = await updateTransactionPartyName(client, fingerprint, party_name);
      return NextResponse.json({ success: ok });
    }

    if (match_key) {
      await savePartyMappingInDB(client, match_key, party_name);
      const count = await bulkUpdateTransactionPartyByMatchKey(client, match_key, party_name);
      return NextResponse.json({ success: true, updatedCount: count });
    }

    return NextResponse.json({ error: "fingerprint or match_key is required." }, { status: 400 });
  } catch (err: any) {
    console.error("API /transactions/party error:", err);
    return NextResponse.json({ error: err.message || "Failed to update party" }, { status: 500 });
  }
}
