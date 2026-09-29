"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingPlans } from "@/components/PricingPlans";
import { TRACK_TYPE_LABELS, effectivePlan, type TrackType, type FileFormat } from "@/lib/types";

interface TrackRow {
  id: string;
  type: TrackType;
  file: File | null;
  externalUrl: string;
  isExternal: boolean;
}

const TRACK_TYPES = Object.keys(TRACK_TYPE_LABELS) as TrackType[];

function formatFromName(name: string): FileFormat | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "wav") return "wav";
  if (ext === "aiff" || ext === "aif") return "aiff";
  if (ext === "mp3") return "mp3";
  return null;
}

export default function NewReleasePage() {
  const router = useRouter();
  const { idToken, user } = useAuth();
  // 2026-09-28 16:55, hosting follows the plan: Linked = Box links only, Pro/Label = either,
  // Free/Starter = uploads only (admins: either). Plan comes from the user doc via /api/me.
  const [me, setMe] = useState<Parameters<typeof effectivePlan>[0] | null>(null);
  useEffect(() => {
    if (!user) return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user ?? null))
      .catch(() => {});
  }, [user]);
  const isAdmin = user?.role === "admin";
  const plan = user && !isAdmin ? effectivePlan({ role: user.role, ...me }).plan : null;
  const canUseExternalLinks = isAdmin || (plan !== null && plan.hosting !== "b2");
  const linkOnly = plan?.hosting === "link";
  const isExt = (t: { isExternal: boolean }) => linkOnly || t.isExternal;

  const [artistName, setArtistName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverExternalUrl, setCoverExternalUrl] = useState("");
  const [coverToggled, setCoverIsExternal] = useState(false);
  const coverIsExternal = linkOnly || coverToggled;
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  // 2026-09-27 01:35, set when the server rejects with PLAN_LIMIT — shows the plan cards
  const [planLimit, setPlanLimit] = useState<{ planId: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const addTrack = () => {
    if (tracks.length >= 7) return;
    setTracks((t) => [
      ...t,
      { id: String(Date.now()), type: "clean_radio", file: null, externalUrl: "", isExternal: false },
    ]);
  };

  const updateTrack = (id: string, patch: Partial<TrackRow>) => {
    setTracks((t) => t.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPlanLimit(null);
    if (!artistName || !songTitle) return setError("Artist and song title are required.");
    if (!idToken) return setError("Sign in is required to publish.");
    const fileTracks = tracks.filter((t) => !isExt(t) && t.file);
    const linkTracks = canUseExternalLinks ? tracks.filter((t) => isExt(t) && t.externalUrl.trim()) : [];
    if (fileTracks.length === 0 && linkTracks.length === 0) return setError("Add at least one audio edit.");

    const filePayloads = fileTracks.map((t) => {
      const fmt = formatFromName(t.file!.name);
      if (!fmt) throw new Error(`Unsupported file type on "${t.file!.name}" — use WAV, AIFF or MP3.`);
      return { type: t.type, fileFormat: fmt, filename: t.file!.name, sizeBytes: t.file!.size };
    });
    const linkPayloads = linkTracks.map((t) => ({ type: t.type, externalUrl: t.externalUrl.trim() }));

    setBusy(true);
    try {
      // 1. Create the release + mint presigned upload URLs for the file-backed tracks.
      const createRes = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName,
          songTitle,
          bpm: bpm ? Number(bpm) : undefined,
          musicalKey: musicalKey || undefined,
          genre: genre.split(",").map((g) => g.trim()).filter(Boolean),
          releaseDate: releaseDate || undefined,
          coverFilename: !coverIsExternal ? cover?.name : undefined,
          coverSizeBytes: !coverIsExternal ? cover?.size : undefined,
          // 2026-09-27 00:45, server signs this exact type into the cover's presigned PUT
          coverContentType: !coverIsExternal ? cover?.type || undefined : undefined,
          coverExternalUrl: coverIsExternal && coverExternalUrl.trim() ? coverExternalUrl.trim() : undefined,
          tracks: [...filePayloads, ...linkPayloads],
        }),
      });
      const created = await createRes.json();
      // 2026-09-27 01:35, over the plan's release limit: show plans instead of a bare error
      // 2026-09-28 16:55, also for storage-cap and hosting-type rejections
      if (createRes.status === 402 && ["PLAN_LIMIT", "PLAN_STORAGE", "PLAN_HOSTING"].includes(created.code)) {
        setPlanLimit({ planId: created.planId, message: created.error });
        return;
      }
      if (!createRes.ok) throw new Error(created.error || "Could not create release");

      // 2. Upload each file-backed edit straight to B2 via its presigned URL (link tracks need no upload).
      let done = 0;
      const totalSteps = fileTracks.length + (cover && !coverIsExternal ? 1 : 0);
      for (let i = 0; i < fileTracks.length; i++) {
        const file = fileTracks[i].file!;
        const { uploadUrl: url, contentType } = created.uploads[i];
        // 2026-09-27 00:45, send the signed Content-Type explicitly; the browser's guess (e.g. audio/x-wav) breaks the signature
        const up = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
        if (!up.ok) throw new Error(`Upload failed for "${file.name}"`);
        done++;
        setProgress(Math.round((done / (totalSteps || 1)) * 80));
      }

      // 3. Upload cover art if provided (skip if using an external cover link).
      if (cover && !coverIsExternal && created.coverUploadUrl) {
        // 2026-09-27 00:45, match the Content-Type the server signed
        const up = await fetch(created.coverUploadUrl, {
          method: "PUT",
          body: cover,
          headers: { "Content-Type": created.coverContentType },
        });
        if (!up.ok) throw new Error("Cover upload failed");
        done++;
        setProgress(Math.round((done / (totalSteps || 1)) * 80));
      }
      setProgress(90);

      // 4. Mark live.
      const fin = await fetch("/api/releases/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId: created.releaseId }),
      });
      if (!fin.ok) {
        const d = await fin.json().catch(() => ({}));
        throw new Error(d.error || "Could not publish");
      }

      setProgress(100);
      router.push("/dashboard/artist?published=1");
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Publish failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell
      title="New service pack"
      nav={[
        { href: "/dashboard/artist", label: "My releases" },
        { href: "/releases/new", label: "New release" },
      ]}
    >
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Release details</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="artistName">Artist name</Label>
              <Input id="artistName" required value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Mendez" />
            </div>
            <div>
              <Label htmlFor="songTitle">Song title</Label>
              <Input id="songTitle" required value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Late Nights" />
            </div>
            <div>
              <Label htmlFor="bpm">BPM</Label>
              <Input id="bpm" type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="124" />
            </div>
            <div>
              <Label htmlFor="key">Musical key</Label>
              <Input id="key" value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)} placeholder="8A" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="genre">Genres (comma separated)</Label>
              <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Tech House, Club" />
            </div>
            <div>
              <Label htmlFor="date">Release date</Label>
              <Input id="date" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cover">Cover art</Label>
                {canUseExternalLinks && !linkOnly && (
                  <button
                    type="button"
                    onClick={() => setCoverIsExternal((v) => !v)}
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    {coverIsExternal ? "Use file upload instead" : "Use Box link instead"}
                  </button>
                )}
              </div>
              {coverIsExternal ? (
                <Input
                  id="coverExternalUrl"
                  type="url"
                  value={coverExternalUrl}
                  onChange={(e) => setCoverExternalUrl(e.target.value)}
                  placeholder="https://app.box.com/s/..."
                />
              ) : (
                <input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-paper-dark file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
                />
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Audio edits (the service pack)</CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={addTrack} disabled={tracks.length >= 7}>
              + Add edit
            </Button>
          </CardHeader>
          <CardBody className="space-y-3">
            {tracks.length === 0 && (
              <p className="text-sm text-ink-soft">
                {linkOnly
                  ? "Add each edit of the release — clean/dirty, instrumental, acapella, intros — as a Box share link (set to “People with the link”)."
                  : "Add each edit of the release — clean/dirty, instrumental, acapella, intros — as WAV, AIFF or 320kbps MP3."}
              </p>
            )}
            {tracks.map((t) => {
              const badFormat = t.file ? !formatFromName(t.file.name) : false;
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border border-ink/10 p-3">
                  <select
                    value={t.type}
                    onChange={(e) => updateTrack(t.id, { type: e.target.value as TrackType })}
                    className="h-10 rounded-md border border-ink/15 bg-white px-2 text-sm text-ink"
                  >
                    {TRACK_TYPES.map((tp) => (
                      <option key={tp} value={tp}>{TRACK_TYPE_LABELS[tp]}</option>
                    ))}
                  </select>
                  {isExt(t) ? (
                    <input
                      type="url"
                      value={t.externalUrl}
                      onChange={(e) => updateTrack(t.id, { externalUrl: e.target.value })}
                      placeholder="https://app.box.com/s/..."
                      className="h-10 flex-1 rounded-md border border-ink/15 bg-white px-3 text-sm text-ink"
                    />
                  ) : (
                    <input
                      type="file"
                      accept=".wav,.aiff,.aif,.mp3,audio/*"
                      onChange={(e) => updateTrack(t.id, { file: e.target.files?.[0] ?? null })}
                      className="flex-1 text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-paper-dark file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
                    />
                  )}
                  {canUseExternalLinks && !linkOnly && (
                    <button
                      type="button"
                      onClick={() => updateTrack(t.id, { isExternal: !t.isExternal, file: null, externalUrl: "" })}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      {t.isExternal ? "Use file upload" : "Use Box link"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTracks((arr) => arr.filter((r) => r.id !== t.id))}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                  {!isExt(t) && badFormat && <span className="text-xs text-red-600">Use WAV / AIFF / MP3</span>}
                  {!isExt(t) && t.file && !badFormat && (
                    <span className="text-xs text-ink-soft">
                      {t.file.name} · {(t.file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>

        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {planLimit && (
          <Card>
            <CardHeader>
              <CardTitle>Upgrade to publish more</CardTitle>
              <p className="text-sm text-ink-soft">{planLimit.message}</p>
            </CardHeader>
            <CardBody>
              <PricingPlans currentPlanId={planLimit.planId} role={user?.role} />
            </CardBody>
          </Card>
        )}

        {progress > 0 && progress < 100 && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-paper-dark">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" isLoading={busy}>
            Publish service pack
          </Button>
          <Link href="/dashboard/artist" className="text-sm font-medium text-ink-soft hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </DashboardShell>
  );
}