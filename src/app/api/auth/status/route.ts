import { NextRequest, NextResponse } from "next/server";
import { getValidAccessCodes, isValidSessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const validCodes = getValidAccessCodes();
  const protectionEnabled = validCodes.length > 0;
  const session = req.cookies.get("statementhub_session")?.value;
  const isAuthenticated = await isValidSessionToken(session);

  return NextResponse.json({
    protectionEnabled,
    isAuthenticated,
  });
}
