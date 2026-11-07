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
    const preferredOrder = [
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
    ];

    const contentModels = (data.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: any) => ({
        id: m.name.replace("models/", ""),
        displayName: m.displayName || m.name.replace("models/", ""),
        description: m.description,
      }))
      .filter(
        (m: any) =>
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
      .sort((a: any, b: any) => {
        const idxA = preferredOrder.indexOf(a.id);
        const idxB = preferredOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.displayName.localeCompare(b.displayName);
      });

    return NextResponse.json({ models: contentModels });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch models" }, { status: 500 });
  }
}
