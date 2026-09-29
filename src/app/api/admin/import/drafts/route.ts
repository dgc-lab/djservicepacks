// 2026-09-28 01:00, admin review queue actions for import-mailbox drafts: publish or discard.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/** { releaseId, action: "publish" | "discard" } */
export async function POST(req: Request) {
  try {
    await requireRole("admin");
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "Admins only" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
  const { releaseId, action } = (await req.json().catch(() => ({}))) as { releaseId?: string; action?: string };
  if (!releaseId || (action !== "publish" && action !== "discard")) {
    return NextResponse.json({ error: "releaseId and action (publish|discard) required" }, { status: 400 });
  }
  const ref = getAdminDb().collection("releases").doc(releaseId);
  const snap = await ref.get();
  const r = snap.data();
  // only touch imported drafts — never an artist's own draft upload
  if (!r || r.status !== "draft" || !r.importSource) {
    return NextResponse.json({ error: "Not an imported draft" }, { status: 404 });
  }
  if (action === "publish") {
    await ref.update({ status: "live", updatedAt: new Date().toISOString() });
    revalidatePath("/");
  } else {
    await ref.delete(); // Box-hosted: no B2 objects to clean up
  }
  return NextResponse.json({ ok: true });
}
