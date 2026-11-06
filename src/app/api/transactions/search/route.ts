import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { fetchTransactionsFromDB } from "@/lib/supabase/transactions";
import { extractIdentifier, isIFSCCode } from "@/lib/parsers/utr-extractor";

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
    const cleanedTransactions = transactions.map((t) => {
      if (t.utr && isIFSCCode(t.utr)) {
        const fixed = extractIdentifier(t.description, "");
        return { ...t, utr: isIFSCCode(fixed) ? "" : fixed };
      }
      return t;
    });
    return NextResponse.json({ transactions: cleanedTransactions });
  } catch (err: any) {
    console.error("API /transactions/search error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch transactions" }, { status: 500 });
  }
}
