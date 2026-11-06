import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSessionToken, getValidAccessCodes } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const validCodes = getValidAccessCodes();

  // If no access code is configured in environment, allow all access
  if (validCodes.length === 0) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Always allow Next.js internals, auth APIs, favicon, and login page
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/login"
  ) {
    // If user is already authenticated and visits /login, redirect to /
    if (pathname === "/login") {
      const session = request.cookies.get("statementhub_session")?.value;
      if (await isValidSessionToken(session)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // Check session cookie
  const session = request.cookies.get("statementhub_session")?.value;
  const isAuthenticated = await isValidSessionToken(session);

  if (!isAuthenticated) {
    // For API requests, return 401 Unauthorized
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Access denied. Valid passcode required." },
        { status: 401 }
      );
    }

    // For pages, redirect to /login
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files & images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
