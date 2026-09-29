import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import type { DropRequest } from "@/lib/types";

export const runtime = "nodejs";

/** Cancel the DJ's own pending drop request. Soft-cancel, not a hard delete. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; dropId: string }> }
) {
  let user;
  try {
    user = await requireRole("dj");
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "DJs only" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const { id: releaseId, dropId } = await params;
  const db = getAdminDb();
  const ref = db
    .collection("releases")
    .doc(releaseId)
    .collection("dropRequests")
    .doc(dropId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  const dropRequest = snap.data() as DropRequest;
  if (dropRequest.djUid !== user.uid) {
    return NextResponse.json({ error: "Not your request" }, { status: 403 });
  }
  if (dropRequest.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending requests can be cancelled" },
      { status: 400 }
    );
  }

  await ref.update({ status: "cancelled", updatedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
