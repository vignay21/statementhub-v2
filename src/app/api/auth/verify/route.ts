import { NextRequest, NextResponse } from "next/server";
import { hashAccessCode, isAccessCodeValid, getValidAccessCodes } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body?.code;

    const validCodes = getValidAccessCodes();
    if (validCodes.length === 0) {
      return NextResponse.json({ success: true, message: "No restriction configured" });
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter the application passcode." },
        { status: 400 }
      );
    }

    const isValid = await isAccessCodeValid(code);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect passcode. Access denied." },
        { status: 401 }
      );
    }

    const token = await hashAccessCode(code);
    const response = NextResponse.json({ success: true });

    response.cookies.set("statementhub_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Authentication error" },
      { status: 500 }
    );
  }
}
