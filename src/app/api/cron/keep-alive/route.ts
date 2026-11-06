import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json({ message: "Supabase client not configured" }, { status: 200 });
    }

    const { data, error } = await client.from("party_mappings").select("match_key").limit(1);

    if (error) {
      return NextResponse.json({ status: "warning", error: error.message }, { status: 200 });
    }

    return NextResponse.json({
      status: "active",
      message: "Supabase database pinged and active",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ status: "error", error: err.message }, { status: 500 });
  }
}
