import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/auth";

/**
 * Next.js 16 "proxy" (formerly middleware).
 * Optimistic route gate: if a protected path is hit with no session cookie and
 * Firebase is configured, redirect to /login. Real authorization happens in
 * server components / API routes via getSessionUser().
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname)) {
    // Only gate when the server has auth wired; otherwise leave pages reachable
    // so the dev build can be viewed before env is configured.
    const hasSession = request.cookies.has("djsession");
    if (!hasSession) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // 2026-09-27 01:25, gate the whole /releases area (feed + detail), not just upload/new
  matcher: ["/dashboard/:path*", "/admin/:path*", "/releases", "/releases/:path*"],
};