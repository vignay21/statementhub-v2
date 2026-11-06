import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/ai/gemini-client";
import { normalizeDate } from "@/lib/formatters/date";
import { parseAmount } from "@/lib/parsers/amount-parser";
import { computeFingerprint } from "@/lib/business/fingerprint";
import { extractPartyMatchKey } from "@/lib/business/party-match-key";
import { Transaction } from "@/types/transaction";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customKey = (formData.get("apiKey") as string | null) || undefined;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    const genAI = getGeminiClient(customKey);
    if (!genAI) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is not configured. Set GEMINI_API_KEY in environment variables or enter it in the AI Assistant.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `You are an expert banking statement extraction engine.
Extract all individual bank transactions from this PDF statement into a clean tabular JSON format.
Each transaction must have:
- "date": Transaction date in DD-MM-YYYY format.
- "description": Full transaction narration or description.
- "debit": Withdrawal/debit amount as a number (or 0/null if credit).
- "credit": Deposit/credit amount as a number (or 0/null if debit).
- "reference": Cheque number, UTR, UPI transaction ID, or IMPS reference if available, else empty string.
- "balance": Account balance after transaction as a number, or null if not available.
- "bank": Detected issuing bank name (e.g. HDFC Bank, Canara Bank, ICICI Bank, SBI, Axis Bank), else "Other Bank".

Return ONLY a valid JSON array of objects.`;

    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-2.0-flash",
    ];

    let responseText = "";
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.0,
          },
        });

        const result = await model.generateContent([
          {
            inlineData: {
              data: base64Data,
              mimeType: "application/pdf",
            },
          },
          prompt,
        ]);

        responseText = result.response.text();
        if (responseText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed for PDF parse:`, err.message);
      }
    }

    if (!responseText) {
      throw new Error(lastError?.message || "All Gemini models failed to parse the PDF statement.");
    }

    let parsedList: any[] = [];
    try {
      parsedList = JSON.parse(responseText);
      if (!Array.isArray(parsedList)) {
        if (parsedList && typeof parsedList === "object") {
          parsedList = (parsedList as any).transactions || (parsedList as any).data || [];
        }
      }
    } catch {
      throw new Error("Failed to parse Gemini AI response into valid transaction list.");
    }

    const transactions: Transaction[] = [];

    for (const item of parsedList) {
      if (!item || typeof item !== "object") continue;

      const date = normalizeDate(item.date || item.Date || "");
      if (!date) continue;

      const desc = String(item.description || item.Description || item.narration || "").trim();
      const ref = String(item.reference || item.Reference || item.utr || item.ref || "").trim();
      const bank = String(item.bank || item.Bank || "Other Bank").trim();

      const debitAmt = parseAmount(item.debit || 0).amount;
      const creditAmt = parseAmount(item.credit || 0).amount;

      let amount = creditAmt;
      let type: "Credit" | "Debit" = "Credit";

      if (debitAmt > 0) {
        amount = debitAmt;
        type = "Debit";
      } else if (creditAmt > 0) {
        amount = creditAmt;
        type = "Credit";
      }

      const balance =
        item.balance !== undefined && item.balance !== null && !isNaN(Number(item.balance))
          ? Number(item.balance)
          : null;

      const party_match_key = extractPartyMatchKey(desc);
      const fingerprint = await computeFingerprint(bank, date, amount, type, ref, desc, balance);

      transactions.push({
        fingerprint,
        bank,
        date,
        description: desc,
        party_name: "",
        amount,
        type,
        utr: ref,
        balance,
        party_match_key,
        source_file: file.name,
      });
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      transactions,
    });
  } catch (err: any) {
    console.error("PDF Parse API error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to extract transactions from PDF" },
      { status: 500 }
    );
  }
}
