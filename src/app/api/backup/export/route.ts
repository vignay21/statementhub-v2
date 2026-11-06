import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { fetchTransactionsFromDB } from "@/lib/supabase/transactions";
import { fetchPartyNamesFromDB, fetchPartyMappingsFromDB } from "@/lib/supabase/party-mappings";

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const [transactions, partyNames, partyMappings] = await Promise.all([
      fetchTransactionsFromDB(client),
      fetchPartyNamesFromDB(client),
      fetchPartyMappingsFromDB(client),
    ]);

    const backup = {
      version: "2.0.0",
      exported_at: new Date().toISOString(),
      counts: {
        transactions: transactions.length,
        stored_parties: partyNames.length,
        party_mappings: partyMappings.length,
      },
      stored_parties: partyNames,
      party_mappings: partyMappings,
      transactions: transactions,
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=statementhub_backup_${new Date().toISOString().split("T")[0]}.json`,
      },
    });
  } catch (err: any) {
    console.error("API /backup/export error:", err);
    return NextResponse.json({ error: err.message || "Failed to export backup" }, { status: 500 });
  }
}
