import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { fetchTransactionsFromDB } from "@/lib/supabase/transactions";
import { extractIdentifier, isIFSCCode } from "@/lib/parsers/utr-extractor";
import { inferBank } from "@/lib/parsers/bank-detector";

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
      let utr = t.utr;
      if (utr && isIFSCCode(utr)) {
        const fixed = extractIdentifier(t.description, "");
        utr = isIFSCCode(fixed) ? "" : fixed;
      }
      let bank = t.bank;
      if (!bank || bank === "Unknown Bank" || bank === "Other Bank") {
        const inferred = inferBank(t.source_file || "", [], [t.description || ""]);
        if (inferred && inferred !== "Unknown Bank") {
          bank = inferred;
        }
      }
      return { ...t, utr, bank };
    });
    return NextResponse.json({ transactions: cleanedTransactions });
  } catch (err: any) {
    console.error("API /transactions/search error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch transactions" }, { status: 500 });
  }
}
