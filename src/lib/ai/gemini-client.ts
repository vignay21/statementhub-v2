import { GoogleGenerativeAI } from "@google/generative-ai";

let genAIClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(customApiKey?: string): GoogleGenerativeAI | null {
  const key = customApiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;

  if (!genAIClient || customApiKey) {
    genAIClient = new GoogleGenerativeAI(key);
  }
  return genAIClient;
}
