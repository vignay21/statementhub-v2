import { NextRequest, NextResponse } from "next/server";
import { generateAIPartySuggestions } from "@/lib/ai/party-suggestions";
import { Transaction } from "@/types/transaction";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transactions: Transaction[] = body.transactions || [];
    const storedParties: string[] = body.storedParties || [];
    const apiKey: string | undefined = body.apiKey;

    if (transactions.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await generateAIPartySuggestions(transactions, storedParties, apiKey);
    return NextResponse.json({ suggestions });
  } catch (err: any) {
    console.error("API /ai/suggest error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate suggestions" }, { status: 500 });
  }
}
