import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { fetchTransactionsFromDB } from "@/lib/supabase/transactions";

export async function GET(req: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json(
        { error: "Supabase connection is not configured." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50000", 10);

    const transactions = await fetchTransactionsFromDB(client, limit);
    return NextResponse.json({ transactions });
  } catch (err: any) {
    console.error("API /transactions/search error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch transactions" }, { status: 500 });
  }
}
