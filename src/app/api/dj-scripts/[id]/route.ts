import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import type { DjScript } from "@/lib/types";

export const runtime = "nodejs";

interface PatchBody {
  title?: string | null;
  body?: string;
  public?: boolean;
}

/** Edit the DJ's own script (title/body). The DJ identity is NOT editable here. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
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
  const { id } = await params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.body?.trim() && body.body !== undefined) {
    return NextResponse.json({ error: "Script text can't be empty" }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection("users").doc(user.uid).collection("djScripts").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Script not found" }, { status: 404 });

  const patch: Partial<DjScript> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) patch.title = body.title || null;
  if (body.body !== undefined) patch.body = body.body.trim();
  if (body.public !== undefined) patch.public = body.public;

  await ref.update(patch);
  return NextResponse.json({ ok: true, ...patch });
}

/** Delete the DJ's own script. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
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
  const { id } = await params;

  const db = getAdminDb();
  await db.collection("users").doc(user.uid).collection("djScripts").doc(id).delete();
  return NextResponse.json({ ok: true });
}