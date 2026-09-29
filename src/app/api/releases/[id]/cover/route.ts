// 2026-09-27 01:20, public cover-art endpoint for the home page "Latest releases" grid.
// Redirects to a fresh short-lived B2 presigned URL (or the admin-supplied external
// cover link) so cached pages never embed an expired signature. Live releases only.
import { NextResponse } from "next/server";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { getPresignedDownloadUrl, isB2Configured } from "@/lib/b2";
import { resolvePlayableUrl } from "@/lib/externalMedia";

export const runtime = "nodejs";

const SIGNED_TTL = 3600;
const REDIRECT_MAX_AGE = 300; // well under the B2 (1h) and Box (~15 min) signed-URL lifetimes

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAdminConfigured()) return new NextResponse(null, { status: 404 });

  const snap = await getAdminDb().collection("releases").doc(id).get();
  const r = snap.data() as
    | { status?: string; coverArtKey?: string | null; coverExternalUrl?: string | null }
    | undefined;
  if (!r || r.status !== "live") return new NextResponse(null, { status: 404 });

  let target: string | undefined;
  // 2026-09-27 02:40, Box file links resolve to the signed boxcloud URL (skips a redirect hop)
  if (r.coverExternalUrl) target = await resolvePlayableUrl(r.coverExternalUrl);
  else if (r.coverArtKey && isB2Configured()) {
    target = await getPresignedDownloadUrl(r.coverArtKey, SIGNED_TTL).catch(() => undefined);
  }
  if (!target) return new NextResponse(null, { status: 404 });

  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", `public, max-age=${REDIRECT_MAX_AGE}`);
  return res;
}
