import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { djApprovedEmail, djRejectedEmail } from "@/lib/emails";
import { requireRole } from "@/lib/session";
import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

interface VerifyBody {
  uid: string;
  decision: "approve" | "reject";
  reason?: string;
}

/** Admin-only: approve/reject a DJ verification application. */
export async function POST(req: Request) {
  try {
    await requireRole("admin");
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message === "UNAUTHORIZED" ? "Sign in required" : "Admins only" },
      { status: (e as Error).message === "UNAUTHORIZED" ? 401 : 403 }
    );
  }

  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.uid || !["approve", "reject"].includes(body.decision)) {
    return NextResponse.json({ error: "uid and decision required" }, { status: 400 });
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(body.uid);
  const doc = await userRef.get();
  if (!doc.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const status = body.decision === "approve" ? "approved" : "rejected";
  await userRef.update({
    "djProfile.verificationStatus": status,
    "djProfile.verifiedAt": status === "approved" ? new Date().toISOString() : null,
    "djProfile.rejectionReason": status === "rejected" ? body.reason ?? null : null,
  });

  if (status === "approved") {
    // Reinforce the role claim (idempotent) — verified DJs unlock bitrate access.
    await getAdminAuth().setCustomUserClaims(body.uid, { role: "dj", djVerified: true });
  }

  // 2026-09-28 12:05, tell the DJ the outcome (fail-soft: the decision is already saved)
  const u = doc.data() as { email?: string | null; displayName?: string; djProfile?: { djName?: string } };
  let emailed = false;
  if (u.email) {
    const name = u.djProfile?.djName || u.displayName || "";
    emailed = await sendMail(
      status === "approved" ? djApprovedEmail(u.email, name) : djRejectedEmail(u.email, name, body.reason)
    );
  }

  return NextResponse.json({ ok: true, status, emailed });
}