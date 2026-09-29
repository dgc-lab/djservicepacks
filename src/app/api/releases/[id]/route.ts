import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { getPresignedDownloadUrl, isB2Configured } from "@/lib/b2";
import type { Release } from "@/lib/types";

export const runtime = "nodejs";

/** Release detail + presigned download URLs per track (signed-in users). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "Forbidden" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ release: null }, { status: 404 });
  }
  const { id } = await params;
  const doc = await getAdminDb().collection("releases").doc(id).get();
  if (!doc.exists) return NextResponse.json({ release: null }, { status: 404 });

  const release = doc.data() as Release;

  // Mint short-lived download URLs for each track: external links pass through as-is,
  // B2-backed tracks get a presigned URL if B2 is configured.
  const b2Ready = isB2Configured();
  const tracks = await Promise.all(
    (release.audioTracks ?? []).map(async (t) => ({
      ...t,
      downloadUrl:
        t.externalUrl ??
        (b2Ready && t.storageKey ? await getPresignedDownloadUrl(t.storageKey) : undefined),
    }))
  );

  return NextResponse.json({
    release: { ...release, releaseId: id, audioTracks: tracks },
  });
}