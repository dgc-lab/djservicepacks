// 2026-09-27 01:20, home page "Latest releases" grid (server component).
// Public teaser: title/artist/genre/cover only. Cards link to the release page,
// which sends logged-out visitors to /login. Renders nothing if there's no data.
import Link from "next/link";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";

const LIMIT = 8;

interface LatestRelease {
  releaseId: string;
  artistName: string;
  songTitle: string;
  genre: string[];
  bpm: number | null;
  hasCover: boolean;
  trackCount: number;
}

async function loadLatest(): Promise<LatestRelease[]> {
  if (!isAdminConfigured()) return [];
  try {
    const snap = await getAdminDb()
      .collection("releases")
      .where("status", "==", "live")
      .orderBy("createdAt", "desc")
      .limit(LIMIT)
      .get();
    return snap.docs.map((d) => {
      const r = d.data();
      return {
        releaseId: d.id,
        artistName: r.artistName ?? "",
        songTitle: r.songTitle ?? "Untitled",
        genre: Array.isArray(r.genre) ? r.genre : [],
        bpm: r.bpm ?? null,
        hasCover: Boolean(r.coverArtKey || r.coverExternalUrl),
        trackCount: Array.isArray(r.audioTracks) ? r.audioTracks.length : 0,
      };
    });
  } catch (e) {
    // Never break the landing page over the teaser grid.
    console.error("LatestReleases: could not load", e);
    return [];
  }
}

export async function LatestReleases() {
  const releases = await loadLatest();
  if (releases.length === 0) return null;

  return (
    <section className="section-dark border-b border-paper/10 text-paper">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-400">Fresh in the crate</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-paper sm:text-4xl">Latest releases</h2>
          </div>
          <Link href="/releases" className="text-sm font-semibold text-brand-400 hover:text-brand-300">
            Browse all packs →
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {releases.map((r) => (
            <li key={r.releaseId}>
              <Link
                href={`/releases/${r.releaseId}`}
                className="group block overflow-hidden rounded-lg border border-paper/10 bg-paper/[0.04] transition-all hover:-translate-y-0.5 hover:border-brand-500/40"
              >
                <div className="relative aspect-square bg-charcoal">
                  {r.hasCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/releases/${r.releaseId}/cover`}
                      alt={`${r.songTitle} cover art`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center p-4 text-center">
                      <span className="text-2xl font-black leading-tight text-brand-400">
                        {r.songTitle.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-paper">{r.songTitle}</p>
                  <p className="truncate text-xs text-paper/60">{r.artistName}</p>
                  <p className="mt-1 truncate text-xs text-paper/40">
                    {[r.genre.join(", "), r.bpm ? `${r.bpm} BPM` : "", `${r.trackCount} edit${r.trackCount === 1 ? "" : "s"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
