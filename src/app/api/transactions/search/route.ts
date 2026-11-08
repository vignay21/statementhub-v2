import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { fetchTransactionsFromDB } from "@/lib/supabase/transactions";
import { cleanTransactionUTR } from "@/lib/business/utr-refiner";
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
      const withCleanUtr = cleanTransactionUTR(t);
      let bank = withCleanUtr.bank;
      if (!bank || bank === "Unknown Bank" || bank === "Other Bank") {
        const inferred = inferBank(t.source_file || "", [], [t.description || ""]);
        if (inferred && inferred !== "Unknown Bank") {
          bank = inferred;
        }
      }
      return { ...withCleanUtr, bank };
    });
    return NextResponse.json({ transactions: cleanedTransactions });
  } catch (err: unknown) {
    console.error("API /transactions/search error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
