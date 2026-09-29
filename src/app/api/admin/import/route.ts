// 2026-09-28 01:00, admin Box import: preview/publish pasted email text, list the review
// queue (drafts created by the import mailbox) and recent import runs.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole, type SessionUser } from "@/lib/session";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { planImport, publishPlans, boxFileLink } from "@/lib/boxImport";
import { resolvePlayableUrl } from "@/lib/externalMedia";

export const runtime = "nodejs";
export const maxDuration = 120; // crawling ~15 Box folders takes a while

async function adminOr401(): Promise<SessionUser | NextResponse> {
  try {
    return await requireRole("admin");
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "Admins only" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
}

/** Review queue (import-mailbox drafts) + the last 20 import runs. */
export async function GET() {
  const admin = await adminOr401();
  if (admin instanceof NextResponse) return admin;
  const db = getAdminDb();
  const [drafts, runs] = await Promise.all([
    // 2026-09-28 09:55, every imported draft (mailbox or saved-as-draft from this page)
    db.collection("releases").where("status", "==", "draft").where("importedVia", "in", ["mailbox", "admin"]).get(),
    db.collection("imports").orderBy("createdAt", "desc").limit(20).get(),
  ]);
  return NextResponse.json({
    drafts: drafts.docs
      .map((d) => {
        const r = d.data();
        return {
          releaseId: d.id,
          via: r.importedVia as "mailbox" | "admin",
          artistName: r.artistName,
          songTitle: r.songTitle,
          edits: Array.isArray(r.audioTracks) ? r.audioTracks.length : 0,
          createdAt: r.createdAt,
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    runs: runs.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
}

/** { action: "preview", text } | { action: "publish", text, shareds: string[], status } */
export async function POST(req: Request) {
  const admin = await adminOr401();
  if (admin instanceof NextResponse) return admin;
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    text?: string;
    shareds?: string[];
    status?: "live" | "draft";
    /** 2026-09-28 01:25, admin-corrected artist/title per Box link id */
    overrides?: Record<string, { artist?: string; title?: string }>;
  };
  if (!body.text?.trim()) return NextResponse.json({ error: "Paste the email text first" }, { status: 400 });

  const plans = await planImport(body.text);
  if (!plans.length) {
    return NextResponse.json(
      { error: "No songs found — expected an artist/title line followed by a box.com/s/… link" },
      { status: 400 }
    );
  }

  if (body.action === "preview") {
    const withThumbs = await Promise.all(
      plans.map(async (p) => ({
        ...p,
        coverUrl: p.cover ? await resolvePlayableUrl(boxFileLink(p.entry.shared, p.cover.fileId)) : null,
      }))
    );
    return NextResponse.json({ plans: withThumbs });
  }

  if (body.action === "publish") {
    const selected = new Set(body.shareds ?? plans.map((p) => p.entry.shared));
    const status = body.status === "draft" ? "draft" : "live";
    const chosen = plans
      .filter((p) => selected.has(p.entry.shared))
      .map((p) => {
        const o = body.overrides?.[p.entry.shared];
        return {
          ...p,
          entry: {
            ...p.entry,
            artist: o?.artist?.trim() || p.entry.artist,
            title: o?.title?.trim() || p.entry.title,
          },
        };
      });
    const results = await publishPlans(
      chosen,
      { ownerUid: admin.uid, ownerRole: "admin", status, via: "admin" }
    );
    await getAdminDb().collection("imports").add({
      via: "admin",
      by: admin.email,
      status,
      createdAt: new Date().toISOString(),
      results,
    });
    if (status === "live") revalidatePath("/");
    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
