// 2026-09-28 01:00, import externally hosted service packs from Box shared-folder links.
// Used by the admin Import page and the import-mailbox poller. Parses free-form email text
// ("Artist “Title”" line followed by an app.box.com/s/<id> link), crawls each public Box
// folder, maps MP3 file names to edit types, picks a cover, and creates releases whose
// edits stream from Box (see lib/externalMedia.ts). Idempotent via importSource "box:<id>".
import "server-only";
import { randomUUID } from "crypto";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { AudioTrack, TrackType } from "@/lib/types";

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------

export interface ImportEntry {
  artist: string;
  title: string;
  shared: string; // Box shared-link id (app.box.com/s/<shared>)
}

interface BoxFile {
  id: string;
  name: string;
  path: string;
  ext: string;
  size: number;
}

export interface PlannedTrack {
  type: TrackType;
  label: string | null;
  fileId: string;
  name: string;
  size: number;
}

export interface PackPlan {
  entry: ImportEntry;
  cover: { fileId: string; name: string } | null;
  tracks: PlannedTrack[];
  skipped: string[]; // MP3s whose edit type couldn't be recognized
  otherFiles: number; // WAV/video/PDF etc. not imported
  existingReleaseId: string | null; // already imported
  error: string | null;
}

// ---------------------------------------------------------------------------
// text parsing
// ---------------------------------------------------------------------------

const BOX_LINK = /https?:\/\/(?:app\.)?box\.com\/s\/([a-z0-9]+)/i;
const SEPARATOR = /^[\s—–\-_=*~]+$/;

function cleanArtistTitle(line: string): { artist: string; title: string } | null {
  const l = line.replace(/\s+/g, " ").trim();
  // Artist “Title” (Remix)   |   Artist "Title"
  const q = l.match(/^(.*?)\s*[“"](.+?)[”"]\s*(.*)$/);
  if (q && q[1]) {
    const title = `${q[2]} ${q[3] ?? ""}`.replace(/\s*\(\s*/g, " (").replace(/\s+/g, " ").trim();
    return { artist: q[1].trim(), title };
  }
  // Artist - Title
  const d = l.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (d) return { artist: d[1].trim(), title: d[2].trim() };
  return null;
}

/** Pull (artist, title, Box link) entries out of pasted/forwarded email text. */
export function parseImportText(text: string): ImportEntry[] {
  const entries: ImportEntry[] = [];
  const seen = new Set<string>();
  let pending: { artist: string; title: string } | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^>+\s?/, "").trim(); // tolerate quoted forwards
    if (!line || SEPARATOR.test(line)) continue;
    const link = line.match(BOX_LINK);
    if (link) {
      // link on the same line as the title ("Artist “Title” https://…") or on its own line
      const before = line.slice(0, link.index).trim();
      const inline = before ? cleanArtistTitle(before) : null;
      const at = inline ?? pending;
      const shared = link[1].toLowerCase();
      if (at && !seen.has(shared)) {
        entries.push({ ...at, shared });
        seen.add(shared);
      }
      pending = null;
      continue;
    }
    const parsed = cleanArtistTitle(line);
    if (parsed) pending = parsed;
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Box folder crawl (public shared links, no API key)
// ---------------------------------------------------------------------------

/** Extract the JSON object assigned to `Box.postStreamData` in a shared-folder page. */
function extractPostStream(html: string): Record<string, unknown> {
  const i = html.indexOf("Box.postStreamData");
  if (i < 0) throw new Error("Box page format not recognized");
  let j = html.indexOf("{", html.indexOf("=", i));
  const start = j;
  let depth = 0;
  let inStr = false;
  for (; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (c === "\\") j++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) break;
  }
  return JSON.parse(html.slice(start, j + 1));
}

interface BoxItem {
  id: number;
  type: "file" | "folder";
  name: string;
  extension?: string;
  itemSize?: number;
}

async function fetchFolderPage(shared: string, folderId: number | null, page: number) {
  const url =
    `https://app.box.com/s/${shared}` +
    (folderId ? `/folder/${folderId}` : "") +
    (page > 1 ? `?page=${page}` : "");
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Box returned ${res.status} (link private or removed?)`);
  const data = extractPostStream(await res.text());
  const sf = data["/app-api/enduserapp/shared-folder"] as
    | { items: BoxItem[]; pageCount?: number }
    | undefined;
  if (!sf) throw new Error("Not a Box shared folder link");
  return sf;
}

async function crawlBox(shared: string, folderId: number | null = null, path = "", depth = 0): Promise<BoxFile[]> {
  const out: BoxFile[] = [];
  for (let page = 1; ; page++) {
    const sf = await fetchFolderPage(shared, folderId, page);
    for (const it of sf.items) {
      if (it.type === "folder" && depth < 3) {
        out.push(...(await crawlBox(shared, it.id, `${path}${it.name}/`, depth + 1)));
      } else if (it.type === "file") {
        out.push({
          id: String(it.id),
          name: it.name,
          path: path + it.name,
          ext: (it.extension ?? "").toLowerCase(),
          size: it.itemSize ?? 0,
        });
      }
    }
    if (page >= (sf.pageCount ?? 1)) break;
  }
  return out;
}

export function boxFileLink(shared: string, fileId: string) {
  return `https://app.box.com/index.php?rm=box_download_shared_file&shared_name=${shared}&file_id=f_${fileId}`;
}

// 2026-09-28 17:05, Linked plans: users paste their own Box share links per edit/cover.
// Turn a pasted share link into the streamable shared-file download link. Accepts
// app.box.com/s/<shared>/file/<id>, a single-file share app.box.com/s/<shared>, or an
// already-normalized download link. Folder links are rejected (they hold a whole pack).
// Non-Box links come back unchanged.
export async function normalizeBoxLink(url: string): Promise<{ url: string } | { error: string }> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { error: "Not a valid link" };
  }
  if (!/(^|\.)box\.com$/i.test(u.hostname)) return { url };
  if (u.searchParams.get("rm") === "box_download_shared_file") return { url };
  const m = u.pathname.match(/^\/s\/([A-Za-z0-9]+)(?:\/file\/(\d+))?/);
  if (!m) return { error: "Use a Box shared link (app.box.com/s/…)" };
  const [, shared, fileId] = m;
  if (fileId) return { url: boxFileLink(shared, fileId) };
  try {
    const res = await fetch(`https://app.box.com/s/${shared}`, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
    if (!res.ok) return { error: "Box link is private or removed — set sharing to “People with the link”." };
    const item = extractPostStream(await res.text())["/app-api/enduserapp/shared-item"] as
      | { itemID?: number; itemType?: string }
      | undefined;
    if (item?.itemType === "file" && item.itemID) return { url: boxFileLink(shared, String(item.itemID)) };
    if (item?.itemType === "folder") return { error: "That's a Box folder link — open the file in Box and copy its own shared link." };
  } catch {
    // fall through
  }
  return { error: "Couldn't read that Box link" };
}

// ---------------------------------------------------------------------------
// file name → edit type
// ---------------------------------------------------------------------------

/** "(Clean) (Intro Edit)" / "[Explicit]" → "Clean Intro Edit" */
function descriptor(name: string) {
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  return [...base.matchAll(/[([]([^)\]]+)[)\]]/g)].map((m) => m[1].trim()).join(" ");
}

export function classifyEdit(name: string): TrackType | null {
  const d = descriptor(name).toLowerCase();
  if (!d) return null;
  const dirty = /\b(dirty|explicit)\b/.test(d);
  if (/acapella|a capella/.test(d)) return dirty ? "acapella_dirty" : "acapella_clean";
  if (/intro/.test(d)) return dirty ? "intro_dirty" : "intro_clean";
  if (/instrumental|\binst\b|\bbeat\b/.test(d)) return "instrumental";
  if (dirty) return "dirty";
  if (/clean|radio/.test(d)) return "clean_radio";
  return null;
}

// descriptors that add nothing beyond the type's standard label
const GENERIC: Record<TrackType, string[]> = {
  clean_radio: ["clean", "radio", "radio edit", "new radio edit"],
  dirty: ["dirty", "explicit"],
  instrumental: ["instrumental"],
  acapella_clean: ["acapella clean", "acapella - clean", "clean acapella", "acapella", "acapella - radio edit"],
  acapella_dirty: ["acapella dirty", "acapella - dirty", "explicit acapella"],
  intro_clean: ["intro - clean", "dj intro clean", "clean intro edit", "intro edit clean", "intro edit"],
  intro_dirty: ["intro - dirty", "dj intro explicit", "dj intro dirty", "dirty intro edit", "intro edit dirty"],
};

function editLabel(type: TrackType, name: string, title: string): string | null {
  const tl = title.toLowerCase();
  const d = descriptor(name)
    .split(/\s+/)
    .filter((w) => w && !(w.length > 3 && tl.includes(w.toLowerCase())))
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  const n = descriptor(name).toLowerCase().replace(/\s+/g, " ").trim();
  return GENERIC[type].includes(n) || !d ? null : d;
}

const ORDER: TrackType[] = ["clean_radio", "dirty", "instrumental", "intro_clean", "intro_dirty", "acapella_clean", "acapella_dirty"];

function pickCover(files: BoxFile[], title: string) {
  const imgs = files.filter((f) => ["jpg", "jpeg", "png", "webp"].includes(f.ext) && !/epk|logo|thumbnail/i.test(f.name));
  const words = title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  return (
    imgs.find((f) => /cover|artwork/i.test(f.name)) ??
    imgs.find((f) => words.some((w) => f.name.toLowerCase().includes(w))) ??
    imgs.find((f) => !f.path.includes("/")) ??
    imgs[0] ??
    null
  );
}

// ---------------------------------------------------------------------------
// plan + publish
// ---------------------------------------------------------------------------

async function planOne(entry: ImportEntry): Promise<PackPlan> {
  const db = getAdminDb();
  const dup = await db.collection("releases").where("importSource", "==", `box:${entry.shared}`).limit(1).get();
  const existingReleaseId = dup.empty ? null : dup.docs[0].id;
  try {
    const files = await crawlBox(entry.shared);
    const mp3 = files.filter((f) => f.ext === "mp3");
    const tracks = mp3
      .map((f) => ({ f, type: classifyEdit(f.name) }))
      .filter((x): x is { f: BoxFile; type: TrackType } => x.type !== null)
      .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
      .map(({ f, type }) => ({ type, label: editLabel(type, f.name, entry.title), fileId: f.id, name: f.name, size: f.size }));
    const cover = pickCover(files, entry.title);
    return {
      entry,
      cover: cover ? { fileId: cover.id, name: cover.name } : null,
      tracks,
      skipped: mp3.filter((f) => !classifyEdit(f.name)).map((f) => f.name),
      otherFiles: files.length - mp3.length - (cover ? 1 : 0),
      existingReleaseId,
      error: tracks.length ? null : "No MP3 edits found in this folder",
    };
  } catch (e) {
    return { entry, cover: null, tracks: [], skipped: [], otherFiles: 0, existingReleaseId, error: (e as Error).message };
  }
}

/** Parse text and crawl every referenced Box folder (a few at a time). */
export async function planImport(text: string): Promise<PackPlan[]> {
  const entries = parseImportText(text);
  const plans: PackPlan[] = new Array(entries.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, entries.length) }, async () => {
      while (next < entries.length) {
        const i = next++;
        plans[i] = await planOne(entries[i]);
      }
    })
  );
  return plans;
}

export interface PublishResult {
  shared: string;
  artist: string;
  title: string;
  releaseId: string | null;
  status: "created" | "exists" | "error";
  message?: string;
}

/**
 * Create releases for importable plans. List order is priority: the first pack gets the
 * newest createdAt so it sorts first in the feed and home grid.
 */
export async function publishPlans(
  plans: PackPlan[],
  opts: { ownerUid: string; ownerRole: string; status: "live" | "draft"; via: string }
): Promise<PublishResult[]> {
  const db = getAdminDb();
  const base = Date.now();
  const results: PublishResult[] = [];
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    const r = { shared: p.entry.shared, artist: p.entry.artist, title: p.entry.title };
    if (p.existingReleaseId) {
      results.push({ ...r, releaseId: p.existingReleaseId, status: "exists" });
      continue;
    }
    if (p.error || !p.tracks.length) {
      results.push({ ...r, releaseId: null, status: "error", message: p.error ?? "Nothing to import" });
      continue;
    }
    const now = new Date(base - i * 1000).toISOString();
    const releaseId = `REL_${randomUUID().slice(0, 8).toUpperCase()}`;
    const audioTracks: AudioTrack[] = p.tracks.map((t) => ({
      trackId: `TRK_${randomUUID().slice(0, 8).toUpperCase()}`,
      type: t.type,
      fileFormat: "mp3",
      storageKey: null,
      externalUrl: boxFileLink(p.entry.shared, t.fileId),
      sizeBytes: t.size,
      uploadedAt: now,
      label: t.label,
    }));
    await db.collection("releases").doc(releaseId).set({
      releaseId,
      ownerId: opts.ownerUid,
      ownerRole: opts.ownerRole,
      artistName: p.entry.artist,
      songTitle: p.entry.title,
      bpm: null,
      musicalKey: null,
      genre: [],
      releaseDate: null,
      coverArtKey: null,
      coverArtUrl: null,
      coverExternalUrl: p.cover ? boxFileLink(p.entry.shared, p.cover.fileId) : null,
      audioTracks,
      featured: false,
      status: opts.status,
      pendingScripts: null,
      importSource: `box:${p.entry.shared}`,
      importedVia: opts.via,
      createdAt: now,
      updatedAt: now,
    });
    results.push({ ...r, releaseId, status: "created" });
  }
  return results;
}
