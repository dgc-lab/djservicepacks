import { NextResponse } from "next/server";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/** Read a user's role from Firestore (fallback to "no role"). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  if (!isAdminConfigured()) {
    return NextResponse.json({ role: null });
  }
  try {
    const doc = await getAdminDb().collection("users").doc(uid).get();
    if (!doc.exists) return NextResponse.json({ role: null });
    const data = doc.data();
    return NextResponse.json({ role: data?.role ?? null });
  } catch (err) {
    console.error("claims lookup failed", err);
    return NextResponse.json({ role: null });
  }
}