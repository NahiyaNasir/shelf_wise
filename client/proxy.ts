import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Quick, early check: no session cookie at all means go to the login page.
 * This only saves a trip. It does NOT prove the person is signed in, because
 * the cookie could be old or fake. The real check is requireUser() in
 * lib/session.ts, which asks the backend.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies.getAll().some((c) => c.name.includes("session_token"));

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
