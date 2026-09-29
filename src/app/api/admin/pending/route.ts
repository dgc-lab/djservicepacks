import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/** Admin-only: list DJ applicants in the verification queue. */
export async function GET() {
  try {
    await requireRole("admin");
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "Admins only" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }

  const snap = await getAdminDb()
    .collection("users")
    .where("role", "==", "dj")
    .where("djProfile.verificationStatus", "==", "pending")
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();

  const applicants = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as object) }));
  return NextResponse.json({ applicants });
}