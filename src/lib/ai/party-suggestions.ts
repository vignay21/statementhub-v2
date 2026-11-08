import { getGeminiClient } from "./gemini-client";
import { fetchLiveGeminiModels } from "./gemini-models";
import { Transaction } from "@/types/transaction";

export interface PartySuggestion {
  fingerprint: string;
  suggested_party: string;
  confidence: "High" | "Medium" | "Low";
  reason: string;
}

export interface SuggestionResult {
  suggestions: PartySuggestion[];
  modelUsed: string;
}

/**
 * Generate AI party suggestions with automatic multi-model fallback.
 */
export async function generateAIPartySuggestions(
  transactions: Transaction[],
  storedParties: string[],
  apiKey?: string,
  preferredModel?: string
): Promise<SuggestionResult> {
  const client = getGeminiClient(apiKey);
  if (!client) {
    throw new Error("Gemini API key is not configured.");
  }

  if (transactions.length === 0 || storedParties.length === 0) {
    return { suggestions: [], modelUsed: "" };
  }

  // 1. Get models list dynamically
  const availableModels = await fetchLiveGeminiModels(apiKey);
  const candidateModels = preferredModel
    ? [preferredModel, ...availableModels.filter((m) => m !== preferredModel)]
    : availableModels;
  const modelsToTry = candidateModels.slice(0, 5);

  // P7 fix: Use numeric index 'id' instead of 64-char hex fingerprint to save prompt tokens
  const promptTransactions = transactions.map((t, idx) => ({
    id: idx,
    bank: t.bank,
    date: t.date,
    amount: t.amount,
    type: t.type,
    description: t.description,
  }));

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
${JSON.stringify(promptTransactions)}

### OUTPUT FORMAT:
Return a JSON array of objects with the exact schema:
[
  {
    "id": 0,
    "suggested_party": "...",
    "confidence": "High" | "Medium" | "Low",
    "reason": "..."
  }
]
`;

  let lastError: unknown = null;

  // 2. Multi-model fallback loop
  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying Gemini model: ${modelName}...`);
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      let parsed: Array<{
        id?: number;
        fingerprint?: string;
        suggested_party?: string;
        confidence?: "High" | "Medium" | "Low";
        reason?: string;
      }> = [];

      try {
        parsed = JSON.parse(responseText);
      } catch (err) {
        console.error("JSON parse failed on model", modelName, responseText);
        continue; // Try next model
      }

      // Enforce directory membership
      const directorySet = new Set(storedParties.map((p) => p.trim().toLowerCase()));

      const finalSuggestions: PartySuggestion[] = transactions.map((origTx, idx) => {
        // Find matching response item by numeric id or fingerprint
        const item = parsed.find(
          (p) => p.id === idx || (p.fingerprint && p.fingerprint === origTx.fingerprint)
        );

        if (!item) {
          return {
            fingerprint: origTx.fingerprint,
            suggested_party: "",
            confidence: "Low" as const,
            reason: "No response generated",
          };
        }

        const cleanSuggestion = (item.suggested_party || "").trim();
        if (cleanSuggestion && directorySet.has(cleanSuggestion.toLowerCase())) {
          const exactMatch = storedParties.find(
            (p) => p.trim().toLowerCase() === cleanSuggestion.toLowerCase()
          );
          return {
            fingerprint: origTx.fingerprint,
            suggested_party: exactMatch || cleanSuggestion,
            confidence: item.confidence || "Medium",
            reason: item.reason || `Matched via ${modelName}`,
          };
        } else {
          return {
            fingerprint: origTx.fingerprint,
            suggested_party: "",
            confidence: "Low" as const,
            reason: "No confident match in authorized directory",
          };
        }
      });

      return {
        suggestions: finalSuggestions,
        modelUsed: modelName,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Model ${modelName} failed: ${errMsg}. Trying next candidate...`);
      lastError = err;
    }
  }

  const lastMsg = lastError instanceof Error ? lastError.message : "Unknown error";
  throw new Error(`All available Gemini models failed. Last error: ${lastMsg}`);
}
