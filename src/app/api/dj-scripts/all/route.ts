import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import type { DropRequest, Release } from "@/lib/types";

export const runtime = "nodejs";

export const maxDuration = 30;

/**
 * Scripts an artist/label can voice for a specific release: only ones a DJ
 * has actually requested (pending DropRequest), scoped to that release and
 * gated to its owner — not every public script platform-wide (Option B).
 */
export async function GET(req: Request) {
  let user;
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
    return NextResponse.json({ scripts: [] }, { status: 200 });
  }

  const url = new URL(req.url);
  const releaseId = url.searchParams.get("releaseId");
  if (!releaseId) {
    return NextResponse.json({ error: "releaseId is required" }, { status: 400 });
  }

  const db = getAdminDb();
  const releaseSnap = await db.collection("releases").doc(releaseId).get();
  if (!releaseSnap.exists) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }
  const release = releaseSnap.data() as Release;
  if (release.ownerId && release.ownerId !== user.uid) {
    return NextResponse.json({ error: "Not your release" }, { status: 403 });
  }

  const snap = await db.collection("releases").doc(releaseId).collection("dropRequests").get();
  const scripts = snap.docs
    .map((d) => d.data() as DropRequest)
    .filter((r) => r.status === "pending")
    .map((r) => ({
      dropId: r.dropId,
      scriptId: r.scriptId,
      djLabel: r.djLabel,
      djName: r.djName,
      stationCallLetters: r.stationCallLetters,
      venueOrUrl: r.venueOrUrl,
      scriptTitle: r.scriptTitle,
      scriptText: r.scriptText,
    }));

  return NextResponse.json({ scripts, count: scripts.length });
}
