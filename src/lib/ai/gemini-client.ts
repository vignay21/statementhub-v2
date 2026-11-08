import { GoogleGenerativeAI } from "@google/generative-ai";

let genAIClient: GoogleGenerativeAI | null = null;

/**
 * Get a Gemini AI client instance.
 * B1 fix: Custom API keys generate an isolated instance and do not overwrite
 * the shared module singleton.
 */
export function getGeminiClient(customApiKey?: string): GoogleGenerativeAI | null {
  const key = customApiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;

  if (customApiKey) {
    return new GoogleGenerativeAI(customApiKey);
  }

  if (!genAIClient) {
    genAIClient = new GoogleGenerativeAI(key);
  }
  return genAIClient;
}
