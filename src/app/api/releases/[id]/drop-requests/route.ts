import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireRole, requireSession } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import type { DjScript, DropRequest, Release } from "@/lib/types";

export const runtime = "nodejs";

/**
 * List drop requests for a release. DJs see their own requests (all
 * statuses); the owning artist/label sees pending requests from any DJ.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireSession();
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "Forbidden" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ dropRequests: [] }, { status: 200 });
  }

  const { id: releaseId } = await params;
  const db = getAdminDb();
  const releaseSnap = await db.collection("releases").doc(releaseId).get();
  if (!releaseSnap.exists) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }
  const release = releaseSnap.data() as Release;

  const snap = await db
    .collection("releases")
    .doc(releaseId)
    .collection("dropRequests")
    .orderBy("createdAt", "desc")
    .get();
  const all = snap.docs.map((d) => d.data() as DropRequest);

  let dropRequests: DropRequest[];
  if (user.role === "dj") {
    dropRequests = all.filter((r) => r.djUid === user.uid);
  } else if (user.role === "artist" || user.role === "label") {
    if (release.ownerId && release.ownerId !== user.uid) {
      return NextResponse.json({ error: "Not your release" }, { status: 403 });
    }
    dropRequests = all.filter((r) => r.status === "pending");
  } else {
    dropRequests = [];
  }

  return NextResponse.json({ dropRequests });
}

/** A DJ requests that the release owner voice one of the DJ's own scripts. */
export async function POST(
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

  const { id: releaseId } = await params;

  let body: { scriptId?: string };
  try {
    body = (await req.json()) as { scriptId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.scriptId) {
    return NextResponse.json({ error: "scriptId is required" }, { status: 400 });
  }

  const db = getAdminDb();
  const releaseSnap = await db.collection("releases").doc(releaseId).get();
  if (!releaseSnap.exists) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }
  const release = releaseSnap.data() as Release;

  const scriptSnap = await db
    .collection("users")
    .doc(user.uid)
    .collection("djScripts")
    .doc(body.scriptId)
    .get();
  if (!scriptSnap.exists) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }
  const script = scriptSnap.data() as DjScript;

  const dropRequestsRef = db.collection("releases").doc(releaseId).collection("dropRequests");
  const existingSnap = await dropRequestsRef.get();
  const duplicate = existingSnap.docs.some((d) => {
    const r = d.data() as DropRequest;
    return r.djUid === user.uid && r.scriptId === body.scriptId && r.status === "pending";
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "You already have a pending request for this script on this release" },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const dropRequest: DropRequest = {
    dropId: `DRQ_${randomUUID().slice(0, 8).toUpperCase()}`,
    releaseId,
    ownerId: release.ownerId ?? null,
    ownerRole: release.ownerRole ?? null,
    djUid: script.djUid,
    djName: script.djName,
    djLabel: script.djLabel,
    stationCallLetters: script.stationCallLetters ?? null,
    venueOrUrl: script.venueOrUrl ?? null,
    scriptId: script.scriptId,
    scriptTitle: script.title ?? null,
    scriptText: script.body,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  await dropRequestsRef.doc(dropRequest.dropId).set(dropRequest);
  return NextResponse.json({ dropRequest }, { status: 201 });
}
