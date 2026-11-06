import { getGeminiClient } from "./gemini-client";
import { Transaction } from "@/types/transaction";

export interface PartySuggestion {
  fingerprint: string;
  suggested_party: string;
  confidence: "High" | "Medium" | "Low";
  reason: string;
}

export async function generateAIPartySuggestions(
  transactions: Transaction[],
  storedParties: string[],
  apiKey?: string
): Promise<PartySuggestion[]> {
  const client = getGeminiClient(apiKey);
  if (!client) {
    throw new Error("Gemini API key is not configured.");
  }

  if (transactions.length === 0 || storedParties.length === 0) {
    return [];
  }

  // Model: gemini-3.8-flash (primary recommended)
  const modelName = "gemini-3.8-flash";
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const prompt = `
You are an expert Indian banking assistant specializing in counterparty identification from bank statement narrations.

### TASK:
Given a list of bank transactions and an AUTHORIZED DIRECTORY of stored party/vendor names, assign the most accurate party name from the directory to each transaction.

### STRICT RULES:
1. You may ONLY choose party names that exist verbatim in the AUTHORIZED DIRECTORY.
2. If no name in the directory matches the narration with confidence, return "" (empty string) as suggested_party and "Low" confidence.
3. NEVER invent, hallucinate, or alter a party name.

### AUTHORIZED DIRECTORY:
${JSON.stringify(storedParties)}

### TRANSACTIONS TO MATCH:
${JSON.stringify(
  transactions.map((t) => ({
    fingerprint: t.fingerprint,
    bank: t.bank,
    date: t.date,
    amount: t.amount,
    type: t.type,
    description: t.description,
  }))
)}

### OUTPUT FORMAT:
Return a JSON array of objects with the exact schema:
[
  {
    "fingerprint": "...",
    "suggested_party": "...",
    "confidence": "High" | "Medium" | "Low",
    "reason": "..."
  }
]
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let parsed: PartySuggestion[] = [];
  try {
    parsed = JSON.parse(responseText);
  } catch (err) {
    console.error("Failed to parse Gemini JSON output:", responseText);
    return [];
  }

  // Post-processing: Strictly enforce directory membership
  const directorySet = new Set(storedParties.map((p) => p.trim().toLowerCase()));

  return parsed.map((item) => {
    const cleanSuggestion = (item.suggested_party || "").trim();
    if (cleanSuggestion && directorySet.has(cleanSuggestion.toLowerCase())) {
      // Find the exact casing from the directory
      const exactMatch = storedParties.find(
        (p) => p.trim().toLowerCase() === cleanSuggestion.toLowerCase()
      );
      return {
        fingerprint: item.fingerprint,
        suggested_party: exactMatch || cleanSuggestion,
        confidence: item.confidence || "Medium",
        reason: item.reason || "Matched with stored directory",
      };
    } else {
      return {
        fingerprint: item.fingerprint,
        suggested_party: "",
        confidence: "Low",
        reason: "No confident match in authorized directory",
      };
    }
  });
}
