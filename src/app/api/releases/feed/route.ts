import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function publicRelease(r: Record<string, unknown>) {
  return {
    releaseId: r.releaseId,
    artistName: r.artistName,
    songTitle: r.songTitle,
    bpm: r.bpm,
    musicalKey: r.musicalKey,
    genre: r.genre,
    releaseDate: r.releaseDate,
    coverArtUrl: r.coverArtUrl,
    // 2026-09-27 01:55, feed cards load covers via /api/releases/[id]/cover
    hasCover: Boolean(r.coverArtKey || r.coverExternalUrl),
    featured: r.featured,
    createdAt: r.createdAt,
    // Live releases only (uploads finalized).
    status: r.status,
    trackCount: Array.isArray(r.audioTracks) ? (r.audioTracks as unknown[]).length : 0,
  };
}

/** List live releases for the discovery feed (any signed-in DJ/artist/label). */
export async function GET(req: Request) {
  try {
    await requireSession();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message === "UNAUTHORIZED" ? "Sign in required" : "Forbidden" },
      { status: (e as Error).message === "UNAUTHORIZED" ? 401 : 403 }
    );
  }

  if (!isAdminConfigured()) return NextResponse.json({ releases: [] });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  const snap = await getAdminDb()
    .collection("releases")
    .where("status", "==", "live")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const releases = snap.docs.map((d) => publicRelease(d.data() as Record<string, unknown>));
  return NextResponse.json({ releases });
}