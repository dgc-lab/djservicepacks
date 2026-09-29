// 2026-09-28 13:00, record a play (the player calls this on the first ▶ of an edit).
// Downloads are recorded by /api/releases/[id]/download/[trackId] instead.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { recordEvent } from "@/lib/tracking";
import type { AudioTrack } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isAdminConfigured()) return new NextResponse(null, { status: 204 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { type?: string; releaseId?: string; trackId?: string };
  if (body.type !== "play" || !body.releaseId || !body.trackId) {
    return NextResponse.json({ error: "type=play, releaseId and trackId required" }, { status: 400 });
  }
  const snap = await getAdminDb().collection("releases").doc(body.releaseId).get();
  const track = (snap.data()?.audioTracks as AudioTrack[] | undefined)?.find((t) => t.trackId === body.trackId);
  if (!track) return NextResponse.json({ error: "Unknown track" }, { status: 404 });

  await recordEvent(user, "play", body.releaseId, body.trackId, track.type);
  return new NextResponse(null, { status: 204 });
}
