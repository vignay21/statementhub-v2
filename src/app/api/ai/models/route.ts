import { NextRequest, NextResponse } from "next/server";
import { filterAndSortModelObjects } from "@/lib/ai/gemini-models";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const headerKey = req.headers.get("x-api-key");
    const { searchParams } = new URL(req.url);
    const queryKey = searchParams.get("key");

    // S2 Fix: Prefer headers over URL query params
    const key = headerKey || bearerKey || queryKey || process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json({ error: "No Gemini API key configured" }, { status: 400 });
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: {
        "x-goog-api-key": key,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: response.status });
    }

    const data = await response.json();
    const contentModels = filterAndSortModelObjects(data.models || []);

    return NextResponse.json({ models: contentModels });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
