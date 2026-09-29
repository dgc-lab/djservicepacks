import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/** Return the current user's full Firestore doc (role + djProfile). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  if (!isAdminConfigured()) return NextResponse.json({ user: null }, { status: 401 });

  const doc = await getAdminDb().collection("users").doc(user.uid).get();
  if (!doc.exists) return NextResponse.json({ user: null }, { status: 404 });
  return NextResponse.json({ user: { uid: doc.id, ...(doc.data() as object) } });
}