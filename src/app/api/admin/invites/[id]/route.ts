// 2026-09-28 18:45, admin: resend (POST) or revoke (DELETE) one invite
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getInvite, sendInvite } from "@/lib/invites";

export const runtime = "nodejs";

async function load(params: Promise<{ id: string }>) {
  let user;
  try {
    user = await requireRole("admin");
  } catch (e) {
    const unauth = (e as Error).message === "UNAUTHORIZED";
    return { denied: NextResponse.json({ error: unauth ? "Sign in required" : "Admins only" }, { status: unauth ? 401 : 403 }) };
  }
  const inv = await getInvite((await params).id);
  if (!inv) return { denied: NextResponse.json({ error: "Invite not found" }, { status: 404 }) };
  if (inv.status === "accepted") return { denied: NextResponse.json({ error: "Already accepted" }, { status: 400 }) };
  return { user, inv };
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await load(params);
  if (r.denied) return r.denied;
  // Resending also re-opens a revoked or expired invite (the 30 days restart from this send).
  const ok = await sendInvite(r.inv, r.user.email ?? undefined);
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await load(params);
  if (r.denied) return r.denied;
  await getAdminDb().collection("invites").doc(r.inv.id).update({ status: "revoked" });
  return NextResponse.json({ ok: true });
}
