import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import {
  updateTransactionPartyName,
  bulkUpdateTransactionPartyByMatchKey,
} from "@/lib/supabase/transactions";
import {
  savePartyNameInDB,
  savePartyMappingInDB,
  fetchPartyNamesFromDB,
} from "@/lib/supabase/party-mappings";

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({ parties: [] });
    }

    const parties = await fetchPartyNamesFromDB(client);
    return NextResponse.json({ parties });
  } catch (err: any) {
    console.error("API /transactions/party GET error:", err);
    return NextResponse.json({ parties: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
    }

    const body = await req.json();
    const { party_name } = body;

    if (!party_name || typeof party_name !== "string" || !party_name.trim()) {
      return NextResponse.json({ error: "party_name is required." }, { status: 400 });
    }

    const ok = await savePartyNameInDB(client, party_name.trim());
    return NextResponse.json({ success: ok, party_name: party_name.trim() });
  } catch (err: any) {
    console.error("API /transactions/party POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save party" }, { status: 500 });
  }
}

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

    // Save in stored party names directory
    await savePartyNameInDB(client, party_name);

    if (fingerprint) {
      const ok = await updateTransactionPartyName(client, fingerprint, party_name);
      return NextResponse.json({ success: ok, party_name });
    }

    if (match_key) {
      await savePartyMappingInDB(client, match_key, party_name);
      const count = await bulkUpdateTransactionPartyByMatchKey(client, match_key, party_name);
      return NextResponse.json({ success: true, updatedCount: count, party_name });
    }

    // Direct addition of party name without updating a transaction
    return NextResponse.json({ success: true, party_name });
  } catch (err: any) {
    console.error("API /transactions/party error:", err);
    return NextResponse.json({ error: err.message || "Failed to update party" }, { status: 500 });
  }
}
