// Server-side session helpers. Reads the httpOnly session cookie that the
// client mints on login (see /api/auth/session) and resolves the current user.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebaseAdmin";
import { SESSION_COOKIE } from "@/lib/auth";
import type { Role } from "@/lib/types";

export interface SessionUser {
  uid: string;
  email: string | null;
  role: Role | null;
}

/**
 * Verify the session cookie, returning the authenticated user (or null).
 * Also fetches the role from Firestore so server-rendered pages gate correctly.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isAdminConfigured()) return null;
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(session, true);
    const { getAdminDb } = await import("@/lib/firebaseAdmin");
    const doc = await getAdminDb()
      .collection("users")
      .doc(decoded.uid)
      .get();
    const role = doc.exists ? ((doc.data()?.role ?? null) as Role | null) : null;
    return { uid: decoded.uid, email: decoded.email ?? null, role };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!user.role || (roles.length && !roles.includes(user.role))) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

// 2026-09-27 01:05, page variants: server components redirect instead of throwing
// (a throw renders a 500 for logged-out visitors or expired session cookies).
/** For pages: redirect to /login?next=<path> when there is no valid session. */
export async function requirePageSession(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** For pages: as requirePageSession, and send users without an allowed role home. */
export async function requirePageRole(nextPath: string, ...roles: Role[]): Promise<SessionUser> {
  const user = await requirePageSession(nextPath);
  if (!user.role || (roles.length && !roles.includes(user.role))) redirect("/");
  return user;
}