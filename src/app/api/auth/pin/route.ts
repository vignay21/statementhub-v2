import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";

const PIN_META_KEY = "__meta_financials_pin";
const DEFAULT_PIN = "1234";

async function getEffectivePin(client: any): Promise<string> {
  try {
    const { data, error } = await client
      .from("party_mappings")
      .select("party_name")
      .eq("match_key", PIN_META_KEY)
      .maybeSingle();

    if (!error && data?.party_name && data.party_name.trim()) {
      return data.party_name.trim();
    }
  } catch (err) {
    console.warn("Error reading PIN from DB, using fallback:", err);
  }
  return DEFAULT_PIN;
}

// POST: Verify entered PIN against database
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = (body?.pin || "").trim();

    if (!pin) {
      return NextResponse.json(
        { success: false, valid: false, error: "PIN is required" },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();
    if (!client) {
      // Local fallback if Supabase not configured
      const isValid = pin === DEFAULT_PIN;
      return NextResponse.json({ success: true, valid: isValid });
    }

    const effectivePin = await getEffectivePin(client);
    const isValid = pin === effectivePin;

    if (!isValid) {
      return NextResponse.json(
        { success: false, valid: false, error: "Incorrect PIN" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, valid: true });
  } catch (err) {
    console.error("PIN verification error:", err);
    return NextResponse.json(
      { success: false, valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Change PIN in database
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const currentPin = (body?.currentPin || "").trim();
    const newPin = (body?.newPin || "").trim();

    if (!currentPin || !newPin) {
      return NextResponse.json(
        { success: false, error: "Both current and new PIN are required" },
        { status: 400 }
      );
    }

    if (newPin.length < 4) {
      return NextResponse.json(
        { success: false, error: "New PIN must be at least 4 digits" },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Database not connected" },
        { status: 500 }
      );
    }

    const effectivePin = await getEffectivePin(client);
    if (currentPin !== effectivePin) {
      return NextResponse.json(
        { success: false, error: "Current PIN is incorrect" },
        { status: 400 }
      );
    }

    const { error: upsertError } = await (client as any)
      .from("party_mappings")
      .upsert({
        match_key: PIN_META_KEY,
        party_name: newPin,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("Failed to update PIN in DB:", upsertError);
      return NextResponse.json(
        { success: false, error: "Failed to save new PIN to database" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "PIN updated successfully" });
  } catch (err) {
    console.error("PIN change error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
