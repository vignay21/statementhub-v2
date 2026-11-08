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
  resetPartyNamesInDB,
} from "@/lib/supabase/party-mappings";
import { DEFAULT_STORED_PARTY_NAMES } from "@/lib/constants/default-parties";

// Q8 fix: Named constant instead of magic number
const MAX_ALLOWED_PARTY_DIRECTORY_SIZE = 200;

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({ parties: DEFAULT_STORED_PARTY_NAMES });
    }

    const parties = await fetchPartyNamesFromDB(client);

    // If corrupted with excess items, automatically prune back to baseline directory
    if (parties.length > MAX_ALLOWED_PARTY_DIRECTORY_SIZE) {
      console.log(`Pruning polluted party directory (${parties.length} items) back to baseline list (${DEFAULT_STORED_PARTY_NAMES.length} items)...`);
      await resetPartyNamesInDB(client, DEFAULT_STORED_PARTY_NAMES);
      return NextResponse.json({ parties: DEFAULT_STORED_PARTY_NAMES });
    }

    // Merge baseline 158 with any valid party names
    const merged = Array.from(new Set([...DEFAULT_STORED_PARTY_NAMES, ...parties])).sort((a, b) =>
      a.localeCompare(b)
    );

    return NextResponse.json({ parties: merged });
  } catch (err: any) {
    console.error("API /transactions/party GET error:", err);
    return NextResponse.json({ parties: DEFAULT_STORED_PARTY_NAMES });
  }
}

export async function DELETE() {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    await resetPartyNamesInDB(client, DEFAULT_STORED_PARTY_NAMES);
    return NextResponse.json({
      success: true,
      message: "Reset directory to authorized 158 party names",
      count: DEFAULT_STORED_PARTY_NAMES.length,
      parties: DEFAULT_STORED_PARTY_NAMES,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
