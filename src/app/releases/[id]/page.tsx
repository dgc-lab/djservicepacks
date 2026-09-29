import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { requirePageSession } from "@/lib/session";
import { getPresignedDownloadUrl, isB2Configured } from "@/lib/b2";
import { resolvePlayableUrl } from "@/lib/externalMedia";
import { WaveformPlayer } from "@/components/WaveformPlayer";
import { NowPlayingProvider } from "@/components/NowPlaying";
import { DropRequests } from "./DropRequests";
import { TRACK_TYPE_LABELS, type Release, type RecordedScript } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 2026-09-27 01:05, redirect (not 500) when logged out / session expired
  const sessionUser = await requirePageSession(`/releases/${id}`);

  if (!isAdminConfigured()) notFound();
  const db = getAdminDb();
  const doc = await db.collection("releases").doc(id).get();
  if (!doc.exists) notFound();
  const release = doc.data() as Release & { releaseId: string };
  const isOwner =
    (sessionUser.role === "artist" || sessionUser.role === "label" || sessionUser.role === "admin") &&
    (!release.ownerId || release.ownerId === sessionUser.uid);

  const b2Ready = isB2Configured();

  // 2026-09-27 02:40, external (e.g. Box) links resolve to a directly streamable URL
  const covers = release.coverExternalUrl
    ? await resolvePlayableUrl(release.coverExternalUrl)
    : (release.coverArtKey && b2Ready
      ? await getPresignedDownloadUrl(release.coverArtKey).catch(() => undefined)
      : undefined);

  // 2026-09-27 02:40, resolve all edits in parallel (Box lookups are ~0.5s each)
  const trackDownloads: Record<string, string | undefined> = Object.fromEntries(
    await Promise.all(
      release.audioTracks.map(async (t) => [
        t.trackId,
        t.externalUrl
          ? await resolvePlayableUrl(t.externalUrl)
          : b2Ready && t.storageKey
            ? await getPresignedDownloadUrl(t.storageKey).catch(() => undefined)
            : undefined,
      ])
    )
  );

  // Recorded (voiced) drop-scripts on this release, labeled by DJ identity.
  const recordedDocs = await db
    .collection("releases")
    .doc(id)
    .collection("recordedScripts")
    .orderBy("createdAt", "desc")
    .get();
  const recorded: (RecordedScript & { audioUrl?: string })[] = recordedDocs.docs.map(
    (d) => d.data() as RecordedScript
  );
  const scriptAudio: Record<string, string | undefined> = {};
  if (b2Ready) {
    for (const r of recorded) {
      scriptAudio[r.id] = await getPresignedDownloadUrl(r.storageKey).catch(() => undefined);
    }
  }
  const recordedWithUrl = recorded.map((r) => ({ ...r, audioUrl: scriptAudio[r.id] }));

  return (
    <DashboardShell
      title={release.songTitle}
      nav={[
        { href: "/dashboard/dj", label: "Home" },
        { href: "/releases", label: "Releases" },
      ]}
    >
      {/* 2026-09-28 00:20, now-playing bar + one-edit-at-a-time for every player on the page */}
      <NowPlayingProvider cover={covers} songTitle={release.songTitle} artistName={release.artistName}>
      {covers && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={covers}
          alt={`${release.artistName} cover art`}
          className="mb-4 h-40 w-40 rounded-lg object-cover border border-ink/10"
        />
      )}
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-ink-soft">{release.artistName}</p>
        <Link href="/releases" className="text-sm font-medium text-brand-700 hover:underline">
          ← Back to feed
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink-soft">
        <span className="rounded-full bg-paper-dark px-3 py-1">{release.genre.join(", ") || "—"}</span>
        {release.bpm && <span className="rounded-full bg-paper-dark px-3 py-1">{release.bpm} BPM</span>}
        {release.musicalKey && (
          <span className="rounded-full bg-paper-dark px-3 py-1">{release.musicalKey}</span>
        )}
        {release.releaseDate && (
          <span className="rounded-full bg-paper-dark px-3 py-1">{release.releaseDate}</span>
        )}
      </div>

      <DropRequests releaseId={id} viewerRole={sessionUser.role} isOwner={isOwner} />

      {recordedWithUrl.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-ink">Voiced drop scripts</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {recordedWithUrl.map((r) => (
              <div key={r.id} className="rounded-lg border border-ink/10 bg-white p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand-700">{r.djLabel}</span>
                  <span className="text-xs uppercase text-ink-soft">
                    {r.fileFormat} · {(r.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
                {r.scriptText && (
                  <p className="mb-2 text-xs text-ink-soft italic line-clamp-2">“{r.scriptText}”</p>
                )}
                {r.audioUrl ? (
                  <WaveformPlayer url={r.audioUrl} title={`${r.djLabel} — voiced script`} />
                ) : (
                  <p className="text-sm text-ink-soft">Audio not available yet.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {release.audioTracks.length > 0 && (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {release.audioTracks.map((t) => (
            <div
              key={t.trackId}
              className="rounded-lg border border-ink/10 bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">
                  {/* 2026-09-27 02:40, prefer the edit's own label (e.g. "4-Bar Intro") */}
                  {t.label || TRACK_TYPE_LABELS[t.type]}
                </span>
                <span className="text-xs uppercase text-ink-soft">
                  {t.fileFormat && t.sizeBytes > 0
                    ? `${t.fileFormat} · ${(t.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                    : "external link"}
                </span>
              </div>
              <WaveformPlayer
                // 2026-09-27 01:55, every edit is playable (was: only the first B2 track got a URL)
                url={trackDownloads[t.trackId]}
                title="Preview"
                trackLabel={t.label || TRACK_TYPE_LABELS[t.type]}
                fallbackHref={t.externalUrl ?? undefined}
                track={{ releaseId: id, trackId: t.trackId }}
              />
              {/* 2026-09-28 13:05, tracked download route (records the download, then redirects to the file) */}
              <a
                href={`/api/releases/${id}/download/${t.trackId}`}
                target={t.fileFormat ? undefined : "_blank"}
                rel={t.fileFormat ? undefined : "noreferrer"}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-paper hover:bg-ink-soft"
              >
                {/* 2026-09-27 02:40, known-format links (imported Box files) download like B2 files */}
                {t.fileFormat ? `Download ${t.fileFormat.toUpperCase()}` : "Open ↗"}
              </a>
            </div>
          ))}
        </div>
      )}
      </NowPlayingProvider>
    </DashboardShell>
  );
}