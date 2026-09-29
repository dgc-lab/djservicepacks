import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireRole } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { getPresignedUploadUrl, buildObjectKey, isB2Configured } from "@/lib/b2";
import { effectivePlan, TRACK_TYPE_LABELS, type TrackType, type FileFormat } from "@/lib/types";
import { normalizeBoxLink } from "@/lib/boxImport";

const TRACK_LABEL = (t: TrackType) => TRACK_TYPE_LABELS[t] ?? t;

export const runtime = "nodejs";

const TRACK_TYPES: TrackType[] = [
  "clean_radio",
  "dirty",
  "instrumental",
  "acapella_clean",
  "acapella_dirty",
  "intro_clean",
  "intro_dirty",
];
const FORMATS: FileFormat[] = ["wav", "aiff", "mp3"];

interface TrackInput {
  type: TrackType;
  // B2-upload path
  fileFormat?: FileFormat;
  filename?: string;
  sizeBytes?: number;
  // admin-only external-link path
  externalUrl?: string;
}

interface CreateReleaseBody {
  artistName: string;
  songTitle: string;
  bpm?: number;
  musicalKey?: string;
  genre: string[];
  releaseDate?: string;
  coverFilename?: string;
  coverSizeBytes?: number;
  // 2026-09-27 00:45, browser-reported cover MIME type — signed into the presigned PUT
  coverContentType?: string;
  coverExternalUrl?: string;
  tracks: TrackInput[];
}

const MAX_URL_LENGTH = 2048;

function isValidExternalUrl(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.length > 0 &&
    url.length <= MAX_URL_LENGTH &&
    /^https?:\/\//i.test(url)
  );
}

/** Create a release and mint presigned B2 upload URLs for its non-external assets. */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireRole("artist", "label", "admin");
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "Artists/labels/admins only" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Server not configured (Firebase Admin)." },
      { status: 500 }
    );
  }

  // 2026-09-28 16:45, plan decides hosting: Linked plans post own-Box links only, Pro/Label may mix,
  // Free/Starter upload to B2 only. Admins can do anything and are never limited.
  const db = getAdminDb();
  const isAdmin = user.role === "admin";
  // 2026-09-28 18:10, effective plan: a paid plan counts only while Stripe says it's paid (or comped)
  const eff = isAdmin ? null : effectivePlan({ role: user.role, ...(await db.collection("users").doc(user.uid).get()).data() });
  const plan = eff?.plan ?? null;
  const canUseExternalLinks = isAdmin || plan!.hosting !== "b2";
  const canUpload = isAdmin || plan!.hosting !== "link";

  let body: CreateReleaseBody;
  try {
    body = (await req.json()) as CreateReleaseBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.artistName || !body.songTitle || !Array.isArray(body.tracks) || body.tracks.length === 0) {
    return NextResponse.json(
      { error: "artistName, songTitle and at least one track are required" },
      { status: 400 }
    );
  }
  let needsB2 = false;
  for (const t of body.tracks) {
    if (!TRACK_TYPES.includes(t.type)) return NextResponse.json({ error: `Bad track type: ${t.type}` }, { status: 400 });
    const hasFile = Boolean(t.filename || t.sizeBytes || t.fileFormat);
    const hasExternal = Boolean(t.externalUrl);
    if (hasFile === hasExternal) {
      return NextResponse.json(
        { error: "Each track needs either a file (filename+size+format) or an external link, not both/neither" },
        { status: 400 }
      );
    }
    if (hasExternal) {
      if (!canUseExternalLinks) {
        return NextResponse.json(
          { error: `Your ${plan!.name} plan uploads files. Box links need a Linked, Pro or Label plan.`, code: "PLAN_HOSTING", planId: plan!.id },
          { status: 402 }
        );
      }
      if (!isValidExternalUrl(t.externalUrl)) {
        return NextResponse.json({ error: "Bad external URL on a track" }, { status: 400 });
      }
    } else {
      if (!t.fileFormat || !FORMATS.includes(t.fileFormat)) return NextResponse.json({ error: `Bad format: ${t.fileFormat}` }, { status: 400 });
      if (!t.filename || !t.sizeBytes) return NextResponse.json({ error: "Track needs filename + size" }, { status: 400 });
      needsB2 = true;
    }
  }
  if (body.coverExternalUrl && !canUseExternalLinks) {
    return NextResponse.json(
      { error: `Your ${plan!.name} plan uploads files. Box links need a Linked, Pro or Label plan.`, code: "PLAN_HOSTING", planId: plan!.id },
      { status: 402 }
    );
  }
  if (body.coverExternalUrl && !isValidExternalUrl(body.coverExternalUrl)) {
    return NextResponse.json({ error: "Bad external cover URL" }, { status: 400 });
  }
  // 2026-09-28 17:05, turn pasted Box share links into streamable file links (folders rejected)
  for (const t of body.tracks) {
    if (!t.externalUrl) continue;
    const n = await normalizeBoxLink(t.externalUrl);
    if ("error" in n) return NextResponse.json({ error: `${TRACK_LABEL(t.type)}: ${n.error}` }, { status: 400 });
    t.externalUrl = n.url;
  }
  if (body.coverExternalUrl) {
    const n = await normalizeBoxLink(body.coverExternalUrl);
    if ("error" in n) return NextResponse.json({ error: `Cover art: ${n.error}` }, { status: 400 });
    body.coverExternalUrl = n.url;
  }
  if (body.coverFilename) needsB2 = true;
  if (needsB2 && !canUpload) {
    return NextResponse.json(
      { error: `Your ${plan!.name} plan is hosted on your own Box — paste Box share links instead of uploading files.`, code: "PLAN_HOSTING", planId: plan!.id },
      { status: 402 }
    );
  }
  // 2026-09-27 00:45, cover must declare a concrete image/* type (a wildcard can't be signed)
  if (body.coverFilename && !/^image\/[a-z0-9.+-]+$/i.test(body.coverContentType ?? "")) {
    return NextResponse.json({ error: "Cover must be an image (coverContentType image/...)" }, { status: 400 });
  }

  if (needsB2 && !isB2Configured()) {
    return NextResponse.json(
      { error: "B2 storage not configured — set B2_* env vars." },
      { status: 500 }
    );
  }

  // 2026-09-27 01:35, plan gate: block publishing past the plan's active-release limit
  // (checked before any presigned URLs are minted, so nothing is uploaded). Admins are exempt;
  // only live releases count, so an abandoned draft never locks anyone out.
  if (plan) {
    if (plan.activeReleases !== null) {
      const active = (
        await db.collection("releases").where("ownerId", "==", user.uid).where("status", "==", "live").count().get()
      ).data().count;
      if (active >= plan.activeReleases) {
        return NextResponse.json(
          {
            error: `Your ${plan.name} plan includes ${plan.activeReleases} active release${plan.activeReleases === 1 ? "" : "s"}. Upgrade to publish more.`,
            code: "PLAN_LIMIT",
            planId: plan.id,
            limit: plan.activeReleases,
          },
          { status: 402 }
        );
      }
    }

    // 2026-09-28 16:45, hosted-storage cap (the B2 markup is the business model). Counts
    // finished B2 uploads (tracks with uploadedAt, covers with coverSizeBytes) plus this request.
    // Sizes are client-declared at mint time — good enough to stop honest overuse, not a hard wall.
    const newBytes =
      body.tracks.reduce((n, t) => n + (t.externalUrl ? 0 : Math.max(0, Number(t.sizeBytes) || 0)), 0) +
      (body.coverFilename ? Math.max(0, Number(body.coverSizeBytes) || 0) : 0);
    const cap = plan.storageBytes + (eff?.extraStorageBytes ?? 0);
    if (newBytes > 0 && plan.storageBytes >= 0) {
      const owned = await db.collection("releases").where("ownerId", "==", user.uid).get();
      let used = 0;
      for (const d of owned.docs) {
        const r = d.data();
        for (const t of (r.audioTracks ?? []) as Array<{ storageKey?: string | null; uploadedAt?: string | null; sizeBytes?: number }>) {
          if (t.storageKey && t.uploadedAt) used += t.sizeBytes ?? 0;
        }
        if (r.coverArtKey) used += (r.coverSizeBytes as number | undefined) ?? 0;
      }
      if (used + newBytes > cap) {
        const mb = (n: number) => `${Math.ceil(n / (1024 * 1024))} MB`;
        return NextResponse.json(
          {
            error: `This upload needs ${mb(newBytes)} but your ${plan.name} plan has ${mb(Math.max(0, cap - used))} left. Upgrade for more storage.`,
            code: "PLAN_STORAGE",
            planId: plan.id,
          },
          { status: 402 }
        );
      }
    }
  }

  const releaseId = `REL_${randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  const uploads: Array<{ type: TrackType; fileFormat: FileFormat; storageKey: string; uploadUrl: string; contentType: string }> = [];
  const audioTracks: Array<{
    trackId: string;
    type: TrackType;
    fileFormat: FileFormat | null;
    storageKey: string | null;
    externalUrl: string | null;
    sizeBytes: number;
    uploadedAt: string | null;
  }> = [];
  for (const t of body.tracks) {
    const trackId = `TRK_${randomUUID().slice(0, 8).toUpperCase()}`;
    if (t.externalUrl) {
      audioTracks.push({
        trackId,
        type: t.type,
        fileFormat: null,
        storageKey: null,
        externalUrl: t.externalUrl,
        sizeBytes: 0,
        uploadedAt: now, // nothing to wait on — the link is already "there"
      });
    } else {
      const storageKey = buildObjectKey(releaseId, "tracks", t.filename!);
      // 2026-09-27 00:45, return the signed contentType so the client PUTs with the exact same header
      const contentType = mimeFor(t.fileFormat!);
      const uploadUrl = await getPresignedUploadUrl(storageKey, contentType);
      uploads.push({ type: t.type, fileFormat: t.fileFormat!, storageKey, uploadUrl, contentType });
      audioTracks.push({
        trackId,
        type: t.type,
        fileFormat: t.fileFormat!,
        storageKey,
        externalUrl: null,
        sizeBytes: t.sizeBytes ?? 0,
        uploadedAt: null,
      });
    }
  }

  let coverKey: string | undefined;
  let coverUploadUrl: string | undefined;
  let coverContentType: string | undefined;
  if (body.coverFilename) {
    coverKey = buildObjectKey(releaseId, "covers", body.coverFilename);
    // 2026-09-27 00:45, sign the real cover type instead of "image/*" (caused SignatureDoesNotMatch)
    coverContentType = body.coverContentType!.toLowerCase();
    coverUploadUrl = await getPresignedUploadUrl(coverKey, coverContentType);
  }

  const releaseDoc = {
    releaseId,
    ownerId: user.uid,
    ownerRole: user.role,
    artistName: body.artistName,
    songTitle: body.songTitle,
    bpm: body.bpm ?? null,
    musicalKey: body.musicalKey ?? null,
    genre: body.genre ?? [],
    releaseDate: body.releaseDate ?? null,
    coverArtKey: coverKey ?? null,
    // 2026-09-28 16:45, recorded for the storage cap
    coverSizeBytes: coverKey ? Math.max(0, Number(body.coverSizeBytes) || 0) : 0,
    coverArtUrl: null,
    coverExternalUrl: body.coverExternalUrl ?? null,
    audioTracks,
    featured: false,
    status: "draft", // draft -> live after uploads finalize
    pendingScripts: null,
    createdAt: now,
  };

  await db.collection("releases").doc(releaseId).set(releaseDoc);

  return NextResponse.json({
    releaseId,
    status: "draft",
    uploads,
    coverUploadUrl,
    coverContentType,
  });
}

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