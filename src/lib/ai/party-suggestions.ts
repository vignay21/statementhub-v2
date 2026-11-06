import { getGeminiClient } from "./gemini-client";
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
 * Fetch available models supporting generateContent from Gemini API.
 */
export async function getAvailableModelsList(apiKey?: string): Promise<string[]> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      const models = (data.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => m.name.replace("models/", ""));

      // Priority sort: preferred flash models first
      const priority = [
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
      ];

      const sorted = models.sort((a: string, b: string) => {
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      return sorted;
    }
  } catch (e) {
    console.warn("Could not list remote Gemini models, using default fallback list", e);
  }

  return [
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
  ];
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
  const availableModels = await getAvailableModelsList(apiKey);
  const candidateModels = preferredModel
    ? [preferredModel, ...availableModels.filter((m) => m !== preferredModel)]
    : availableModels;

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

  let lastError: any = null;

  // 2. Multi-model fallback loop
  for (const modelName of candidateModels) {
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

      let parsed: PartySuggestion[] = [];
      try {
        parsed = JSON.parse(responseText);
      } catch (err) {
        console.error("JSON parse failed on model", modelName, responseText);
        continue; // Try next model
      }

      // Enforce directory membership
      const directorySet = new Set(storedParties.map((p) => p.trim().toLowerCase()));

      const finalSuggestions = parsed.map((item) => {
        const cleanSuggestion = (item.suggested_party || "").trim();
        if (cleanSuggestion && directorySet.has(cleanSuggestion.toLowerCase())) {
          const exactMatch = storedParties.find(
            (p) => p.trim().toLowerCase() === cleanSuggestion.toLowerCase()
          );
          return {
            fingerprint: item.fingerprint,
            suggested_party: exactMatch || cleanSuggestion,
            confidence: item.confidence || "Medium",
            reason: item.reason || `Matched via ${modelName}`,
          };
        } else {
          return {
            fingerprint: item.fingerprint,
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
    } catch (err: any) {
      console.warn(`Model ${modelName} failed: ${err.message}. Trying next candidate...`);
      lastError = err;
    }
  }

  throw new Error(
    `All available Gemini models failed. Last error: ${lastError?.message || "Unknown error"}`
  );
}
