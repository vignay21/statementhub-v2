export interface GeminiUsage {
  date: string;
  requestsUsed: number;
  requestsRemaining: number;
  tokensConsumed: number;
  maxDailyRequests: number;
}

const STORAGE_KEY = "statementhub_gemini_usage";
const DEFAULT_DAILY_LIMIT = 1500;

export function getLocalGeminiUsage(): GeminiUsage {
  const today = new Date().toISOString().split("T")[0];

  if (typeof window === "undefined") {
    return {
      date: today,
      requestsUsed: 0,
      requestsRemaining: DEFAULT_DAILY_LIMIT,
      tokensConsumed: 0,
      maxDailyRequests: DEFAULT_DAILY_LIMIT,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: GeminiUsage = JSON.parse(raw);
      if (data.date === today) {
        return data;
      }
    }
  } catch (e) {}

  const fresh: GeminiUsage = {
    date: today,
    requestsUsed: 0,
    requestsRemaining: DEFAULT_DAILY_LIMIT,
    tokensConsumed: 0,
    maxDailyRequests: DEFAULT_DAILY_LIMIT,
  };
  saveLocalGeminiUsage(fresh);
  return fresh;
}

export function saveLocalGeminiUsage(usage: GeminiUsage) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch (e) {}
}

export function recordGeminiCall(tokens: number = 0): GeminiUsage {
  const current = getLocalGeminiUsage();
  current.requestsUsed += 1;
  current.requestsRemaining = Math.max(0, current.maxDailyRequests - current.requestsUsed);
  current.tokensConsumed += tokens;
  saveLocalGeminiUsage(current);
  return current;
}

export function resetGeminiUsage(): GeminiUsage {
  const today = new Date().toISOString().split("T")[0];
  const fresh: GeminiUsage = {
    date: today,
    requestsUsed: 0,
    requestsRemaining: DEFAULT_DAILY_LIMIT,
    tokensConsumed: 0,
    maxDailyRequests: DEFAULT_DAILY_LIMIT,
  };
  saveLocalGeminiUsage(fresh);
  return fresh;
}
