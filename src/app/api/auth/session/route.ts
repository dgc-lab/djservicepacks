import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebaseAdmin";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Server auth not configured" }, { status: 500 });
  }
  const { idToken } = (await req.json()) as { idToken?: string };
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }
  try {
    const expiresIn = SESSION_MAX_AGE_SECONDS;
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: expiresIn * 1000,
    });
    (await cookies()).set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("session mint failed", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}