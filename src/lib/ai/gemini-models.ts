/**
 * Helper to fetch live models from Google Gemini API and handle automatic failover.
 */

export const DEFAULT_FALLBACK_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
];

export async function fetchLiveGeminiModels(apiKey?: string): Promise<string[]> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return DEFAULT_FALLBACK_MODELS;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { cache: "no-store" }
    );

    if (res.ok) {
      const data = await res.json();
      const liveModels: string[] = (data.models || [])
        .filter(
          (m: any) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes("generateContent")
        )
        .map((m: any) => m.name.replace(/^models\//, ""));

      if (liveModels.length > 0) {
        // Preferred priority order of real Gemini models
        const preferredOrder = [
          "gemini-1.5-flash",
          "gemini-2.0-flash",
          "gemini-1.5-flash-8b",
          "gemini-1.5-pro",
          "gemini-2.0-flash-lite",
          "gemini-flash-latest",
        ];

        return liveModels.sort((a, b) => {
          const idxA = preferredOrder.indexOf(a);
          const idxB = preferredOrder.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.localeCompare(b);
        });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live Gemini models list, using fallbacks:", err);
  }

  return DEFAULT_FALLBACK_MODELS;
}
