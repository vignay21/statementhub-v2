import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { syncTransactionsWithDB } from "@/lib/supabase/transactions";
import { extractIdentifier, isIFSCCode } from "@/lib/parsers/utr-extractor";
import { Transaction } from "@/types/transaction";

export async function POST(req: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json(
        { error: "Supabase connection is not configured on server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const transactions: Transaction[] = body.transactions || [];

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: 0, total: 0 });
    }

    const cleanedTransactions = transactions.map((t) => {
      if (t.utr && isIFSCCode(t.utr)) {
        const fixed = extractIdentifier(t.description, "");
        return { ...t, utr: isIFSCCode(fixed) ? "" : fixed };
      }
      return t;
    });

    const result = await syncTransactionsWithDB(client, cleanedTransactions);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("API /transactions/sync error:", err);
    return NextResponse.json({ error: err.message || "Failed to sync transactions" }, { status: 500 });
  }
}
