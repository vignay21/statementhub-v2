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
  fetchPartyMappingsFromDB,
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

    const [parties, rawMappings] = await Promise.all([
      fetchPartyNamesFromDB(client),
      fetchPartyMappingsFromDB(client),
    ]);

    const mappings: Record<string, string> = {};
    for (const m of rawMappings) {
      if (m.match_key && m.party_name) {
        mappings[m.match_key.toUpperCase()] = m.party_name;
      }
    }

    // If corrupted with excess items, automatically prune back to baseline directory
    if (parties.length > MAX_ALLOWED_PARTY_DIRECTORY_SIZE) {
      console.log(`Pruning polluted party directory (${parties.length} items) back to baseline list (${DEFAULT_STORED_PARTY_NAMES.length} items)...`);
      await resetPartyNamesInDB(client, DEFAULT_STORED_PARTY_NAMES);
      return NextResponse.json({ parties: DEFAULT_STORED_PARTY_NAMES, mappings });
    }

    // Merge baseline 158 with any valid party names
    const merged = Array.from(new Set([...DEFAULT_STORED_PARTY_NAMES, ...parties])).sort((a, b) =>
      a.localeCompare(b)
    );

    return NextResponse.json({ parties: merged, mappings });
  } catch (err: any) {
    console.error("API /transactions/party GET error:", err);
    return NextResponse.json({ parties: DEFAULT_STORED_PARTY_NAMES, mappings: {} });
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

    const cleanParty = String(party_name).trim();

    // Parallelize writes to Supabase for minimum latency
    const tasks: Promise<any>[] = [];

    if (match_key) {
      tasks.push(savePartyMappingInDB(client, match_key, cleanParty));
    } else {
      tasks.push(savePartyNameInDB(client, cleanParty));
    }

    if (fingerprint) {
      tasks.push(updateTransactionPartyName(client, fingerprint, cleanParty));
    } else if (match_key) {
      tasks.push(bulkUpdateTransactionPartyByMatchKey(client, match_key, cleanParty));
    }

    const results = await Promise.all(tasks);

    return NextResponse.json({
      success: true,
      party_name: cleanParty,
      updatedCount: typeof results[1] === "number" ? results[1] : 1,
    });
  } catch (err: any) {
    console.error("API /transactions/party error:", err);
    return NextResponse.json({ error: err.message || "Failed to update party" }, { status: 500 });
  }
}
