import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      // E4 fix: Return 503 Service Unavailable when DB client is unconfigured
      return NextResponse.json(
        { status: "error", message: "Supabase client not configured" },
        { status: 503 }
      );
    }

    const { data, error } = await client.from("party_mappings").select("match_key").limit(1);

    if (error) {
      // E4 fix: Return 500 when database query encounters an error
      return NextResponse.json(
        { status: "error", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "active",
      message: "Supabase database pinged and active",
      timestamp: new Date().toISOString(),
      rowsChecked: data?.length || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
