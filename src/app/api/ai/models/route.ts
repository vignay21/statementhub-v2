import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") || process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json({ error: "No Gemini API key configured" }, { status: 400 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: response.status });
    }

    const data = await response.json();
    const contentModels = (data.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: any) => ({
        id: m.name.replace("models/", ""),
        displayName: m.displayName || m.name.replace("models/", ""),
        description: m.description,
      }));

    return NextResponse.json({ models: contentModels });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch models" }, { status: 500 });
  }
}
