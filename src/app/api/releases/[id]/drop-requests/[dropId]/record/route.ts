import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireRole, type SessionUser } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { getPresignedUploadUrl, buildObjectKey, isB2Configured } from "@/lib/b2";
import type { DropRequest, FileFormat, RecordedScript, Release } from "@/lib/types";

export const runtime = "nodejs";

const FORMATS: FileFormat[] = ["wav", "aiff", "mp3"];

function mimeFor(f: FileFormat): string {
  switch (f) {
    case "wav":
      return "audio/wav";
    case "aiff":
      return "audio/aiff";
    case "mp3":
      return "audio/mpeg";
  }
}

async function loadAndGuard(
  releaseId: string,
  dropId: string,
  user: SessionUser
): Promise<
  | { error: NextResponse }
  | { release: Release; dropRequest: DropRequest; dropRef: FirebaseFirestore.DocumentReference }
> {
  const db = getAdminDb();
  const releaseSnap = await db.collection("releases").doc(releaseId).get();
  if (!releaseSnap.exists) {
    return { error: NextResponse.json({ error: "Release not found" }, { status: 404 }) };
  }
  const release = releaseSnap.data() as Release;
  if (release.ownerId && release.ownerId !== user.uid) {
    return { error: NextResponse.json({ error: "Not your release" }, { status: 403 }) };
  }

  const dropRef = db
    .collection("releases")
    .doc(releaseId)
    .collection("dropRequests")
    .doc(dropId);
  const dropSnap = await dropRef.get();
  if (!dropSnap.exists) {
    return { error: NextResponse.json({ error: "Request not found" }, { status: 404 }) };
  }
  const dropRequest = dropSnap.data() as DropRequest;
  if (dropRequest.status !== "pending") {
    return {
      error: NextResponse.json({ error: "Only pending requests can be recorded" }, { status: 400 }),
    };
  }

  return { release, dropRequest, dropRef };
}

/** Mint a presigned upload URL for the voiced recording. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; dropId: string }> }
) {
  let user: SessionUser;
  try {
    user = await requireRole("artist", "label");
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "Artists/labels only" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const { id: releaseId, dropId } = await params;
  const guard = await loadAndGuard(releaseId, dropId, user);
  if ("error" in guard) return guard.error;

  let body: { filename?: string; sizeBytes?: number; fmt?: FileFormat };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.filename || !body.sizeBytes || !body.fmt) {
    return NextResponse.json({ error: "filename, sizeBytes and fmt are required" }, { status: 400 });
  }
  if (!FORMATS.includes(body.fmt)) {
    return NextResponse.json({ error: `Bad audio format: ${body.fmt}` }, { status: 400 });
  }
  if (!isB2Configured()) {
    return NextResponse.json(
      { error: "B2 storage not configured — set B2_* env vars." },
      { status: 500 }
    );
  }

  const storageKey = buildObjectKey(releaseId, "scriptaudio", body.filename);
  // 2026-09-27 00:45, return the signed contentType so the client PUTs with the exact same header
  const contentType = mimeFor(body.fmt);
  const uploadUrl = await getPresignedUploadUrl(storageKey, contentType);

  return NextResponse.json({
    uploadUrl,
    contentType,
    storageKey,
    fileFormat: body.fmt,
    sizeBytes: body.sizeBytes,
  });
}

/** Confirm the upload: materialize a RecordedScript and mark the request fulfilled. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; dropId: string }> }
) {
  let user: SessionUser;
  try {
    user = await requireRole("artist", "label");
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "Artists/labels only" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const { id: releaseId, dropId } = await params;
  const guard = await loadAndGuard(releaseId, dropId, user);
  if ("error" in guard) return guard.error;
  const { release, dropRequest, dropRef } = guard;

  let body: { storageKey?: string; fileFormat?: FileFormat; sizeBytes?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.storageKey || !body.fileFormat || !body.sizeBytes) {
    return NextResponse.json(
      { error: "storageKey, fileFormat and sizeBytes are required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const id = `REC_${randomUUID().slice(0, 8).toUpperCase()}`;
  const recordedScript: RecordedScript = {
    id,
    releaseId,
    songTitle: release.songTitle ?? null,
    scriptId: dropRequest.scriptId,
    scriptText: dropRequest.scriptText ?? null,
    djId: dropRequest.djUid,
    djName: dropRequest.djName,
    stationCallLetters: dropRequest.stationCallLetters ?? null,
    venueOrUrl: dropRequest.venueOrUrl ?? null,
    djLabel: dropRequest.djLabel,
    voicedByUid: user.uid,
    storageKey: body.storageKey,
    fileFormat: body.fileFormat,
    sizeBytes: body.sizeBytes,
    createdAt: now,
  };

  await getAdminDb()
    .collection("releases")
    .doc(releaseId)
    .collection("recordedScripts")
    .doc(id)
    .set(recordedScript);
  await dropRef.update({ status: "fulfilled", updatedAt: now });

  return NextResponse.json({ ok: true, recordedScript });
}
