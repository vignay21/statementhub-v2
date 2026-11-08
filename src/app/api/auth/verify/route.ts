import { NextRequest, NextResponse } from "next/server";
import { hashAccessCode, isAccessCodeValid, getValidAccessCodes } from "@/lib/auth";

interface RateLimitRecord {
  attempts: number;
  blockedUntil: number;
  firstAttempt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const WINDOW_MS = 15 * 60 * 1000;

function cleanupRateLimits() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.blockedUntil && now - record.firstAttempt > WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const clientIP = getClientIP(req);
    const now = Date.now();

    // Occasional map maintenance
    if (rateLimitMap.size > 1000) {
      cleanupRateLimits();
    }

    // Check rate limit status
    const record = rateLimitMap.get(clientIP);
    if (record) {
      if (record.blockedUntil > now) {
        const retryAfterSec = Math.ceil((record.blockedUntil - now) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: `Too many failed attempts. Please try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
          },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfterSec) },
          }
        );
      }
      // Reset if window expired
      if (now - record.firstAttempt > WINDOW_MS) {
        rateLimitMap.delete(clientIP);
      }
    }

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

    const isValid = isAccessCodeValid(code);
    if (!isValid) {
      const current = rateLimitMap.get(clientIP) || {
        attempts: 0,
        blockedUntil: 0,
        firstAttempt: now,
      };
      current.attempts += 1;
      if (current.attempts >= MAX_ATTEMPTS) {
        current.blockedUntil = now + BLOCK_DURATION_MS;
      }
      rateLimitMap.set(clientIP, current);

      const remaining = Math.max(0, MAX_ATTEMPTS - current.attempts);
      const errorMsg =
        current.attempts >= MAX_ATTEMPTS
          ? "Too many incorrect attempts. Account locked for 15 minutes."
          : `Incorrect passcode. Access denied. (${remaining} attempt${remaining === 1 ? "" : "s"} left)`;

      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: current.attempts >= MAX_ATTEMPTS ? 429 : 401 }
      );
    }

    // Successful login: clear rate limit record
    rateLimitMap.delete(clientIP);

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
