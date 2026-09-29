// 2026-09-28 13:00, tracked download: records the download, then 302s to the file.
// B2 files are presigned with Content-Disposition: attachment (named "Artist - Title (Edit).ext")
// so browsers save them instead of playing inline; Box links already download as attachments.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { getPresignedDownloadUrl, isB2Configured } from "@/lib/b2";
import { resolvePlayableUrl } from "@/lib/externalMedia";
import { recordEvent } from "@/lib/tracking";
import { TRACK_TYPE_LABELS, type AudioTrack } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; trackId: string }> }) {
  const { id, trackId } = await params;
  const user = await getSessionUser();
  if (!user) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", `/releases/${id}`);
    return NextResponse.redirect(login);
  }
  if (!isAdminConfigured()) return new NextResponse(null, { status: 404 });

  const r = (await getAdminDb().collection("releases").doc(id).get()).data();
  const track = (r?.audioTracks as AudioTrack[] | undefined)?.find((t) => t.trackId === trackId);
  if (!r || !track) return new NextResponse("Not found", { status: 404 });

  let target: string | undefined;
  if (track.externalUrl) {
    target = await resolvePlayableUrl(track.externalUrl);
  } else if (track.storageKey && isB2Configured()) {
    const edit = track.label || TRACK_TYPE_LABELS[track.type];
    const filename = `${r.artistName} - ${r.songTitle} (${edit}).${track.fileFormat ?? "mp3"}`.replace(/[/\\]/g, "-");
    target = await getPresignedDownloadUrl(track.storageKey, 3600, filename).catch(() => undefined);
  }
  if (!target) return new NextResponse("File unavailable", { status: 404 });

  await recordEvent(user, "download", id, trackId, track.type);
  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "no-store"); // every click is a new download
  return res;
}
