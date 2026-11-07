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
        .map((m: any) => m.name.replace(/^models\//, ""))
        .filter(
          (name: string) =>
            !name.includes("1.5") &&
            !name.includes("2.0") &&
            !name.includes("2.5") &&
            !name.includes("tts") &&
            !name.includes("image") &&
            !name.includes("clip") &&
            !name.includes("transcribe") &&
            !name.includes("computer-use") &&
            !name.includes("robotics")
        );

      if (liveModels.length > 0) {
        // Preferred priority order of real Gemini models
        const preferredOrder = [
          "gemini-flash-lite-latest",
          "gemini-3.5-flash-lite",
          "gemini-3.5-flash",
          "gemini-3.6-flash",
          "gemini-3.8-flash",
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
