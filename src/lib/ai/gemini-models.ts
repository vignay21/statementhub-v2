/**
 * Helper to fetch live models from Google Gemini API and handle automatic failover.
 */

export const DEFAULT_FALLBACK_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

export const PREFERRED_MODEL_ORDER = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

export interface GeminiModelInfo {
  id: string;
  displayName: string;
  description?: string;
}

export function filterAndSortModelObjects(rawModels: any[]): GeminiModelInfo[] {
  return (rawModels || [])
    .filter((m: any) =>
      Array.isArray(m?.supportedGenerationMethods) &&
      m.supportedGenerationMethods.includes("generateContent")
    )
    .map((m: any) => ({
      id: (m.name || "").replace(/^models\//, ""),
      displayName: m.displayName || (m.name || "").replace(/^models\//, ""),
      description: m.description,
    }))
    .filter(
      (m: GeminiModelInfo) =>
        !m.id.includes("1.5") &&
        !m.id.includes("2.0") &&
        !m.id.includes("2.5") &&
        !m.id.includes("tts") &&
        !m.id.includes("image") &&
        !m.id.includes("clip") &&
        !m.id.includes("transcribe") &&
        !m.id.includes("computer-use") &&
        !m.id.includes("robotics")
    )
    .sort((a: GeminiModelInfo, b: GeminiModelInfo) => {
      const idxA = PREFERRED_MODEL_ORDER.indexOf(a.id);
      const idxB = PREFERRED_MODEL_ORDER.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
}

export async function fetchLiveGeminiModels(apiKey?: string): Promise<string[]> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return DEFAULT_FALLBACK_MODELS;

  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": key },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      const filtered = filterAndSortModelObjects(data.models || []);
      if (filtered.length > 0) {
        return filtered.map((m) => m.id);
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live Gemini models list, using fallbacks:", err);
  }

  return DEFAULT_FALLBACK_MODELS;
}
