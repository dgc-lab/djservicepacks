import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { requireRole, type SessionUser } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import type { AudioTrack, PendingScript, RecordedScript } from "@/lib/types";

export const runtime = "nodejs";

/** Mark a draft release live after its files have been uploaded to B2. */
export async function POST(req: Request) {
  let sessionUser: SessionUser;
  try {
    sessionUser = await requireRole("artist", "label", "admin");
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "Artists/labels/admins only" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const body = (await req.json()) as { releaseId?: string; uploadedScriptIds?: string[] };
  if (!body.releaseId) {
    return NextResponse.json({ error: "releaseId required" }, { status: 400 });
  }

  const ref = getAdminDb().collection("releases").doc(body.releaseId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Release not found" }, { status: 404 });

  const data = snap.data() as {
    ownerId?: string;
    coverArtKey?: string | null;
    songTitle?: string;
    pendingScripts?: PendingScript[] | null;
    audioTracks?: AudioTrack[];
  };
  if (data.ownerId && data.ownerId !== sessionUser.uid) {
    return NextResponse.json({ error: "Not your release" }, { status: 403 });
  }

  const now = new Date().toISOString();

  // Materialize recorded-script docs from pendingScripts[] (created at draft time),
  // carrying the denormalized DJ identity so the credit shows without a join.
  const pending = data.pendingScripts ?? [];
  // Client reports which script files it actually PUT to B2; if absent, keep all.
  const uploadedIds = body.uploadedScriptIds ?? pending.map((p) => p.scriptId);
  const matcher = new Set(uploadedIds);
  const recordedIds: string[] = [];
  const recordedDocs = getAdminDb().collection("releases").doc(body.releaseId).collection("recordedScripts");
  for (const p of pending) {
    if (p.uploadStatus !== "uploaded" && !uploadedIds.length) continue;
    if (!matcher.has(p.scriptId)) continue;
    const id = `REC_${randomUUID().slice(0, 8).toUpperCase()}`;
    const recorded: RecordedScript = {
      id,
      releaseId: body.releaseId,
      songTitle: data.songTitle ?? null,
      scriptId: p.scriptId,
      scriptText: p.scriptText,
      djId: p.djUid,
      djName: p.djName,
      stationCallLetters: p.stationCallLetters ?? null,
      venueOrUrl: p.venueOrUrl ?? null,
      djLabel: p.djLabel,
      voicedByUid: sessionUser.uid,
      storageKey: p.storageKey,
      fileFormat: p.fileFormat,
      sizeBytes: p.sizeBytes,
      createdAt: now,
    };
    await recordedDocs.doc(id).set(recorded);
    recordedIds.push(id);
  }

  // 2026-09-27 02:05, stamp file-backed tracks as uploaded (was left null on live releases)
  const audioTracks = (data.audioTracks ?? []).map((t) =>
    t.uploadedAt ? t : { ...t, uploadedAt: now }
  );

  await ref.update({
    status: "live",
    audioTracks,
    updatedAt: now,
    coverArtUrl: data.coverArtKey ?? null,
    // Clear the transient draft list now that it's materialized.
    pendingScripts: null,
  });
  // 2026-09-27 01:20, refresh the home page's Latest releases grid right away
  revalidatePath("/");
  return NextResponse.json({ ok: true, status: "live", recordedScripts: recordedIds });
}