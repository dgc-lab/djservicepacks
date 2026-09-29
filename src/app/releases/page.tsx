"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedRelease {
  releaseId: string;
  artistName: string;
  songTitle: string;
  bpm: number | null;
  musicalKey: string | null;
  genre: string[];
  releaseDate: string | null;
  coverArtUrl: string | null;
  hasCover: boolean;
  featured: boolean;
  createdAt: string;
  trackCount: number;
}

export default function ReleasesPage() {
  const [releases, setReleases] = useState<FeedRelease[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/releases/feed")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load the feed");
        const d = (await r.json()) as { releases: FeedRelease[] };
        setReleases(d.releases ?? []);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <DashboardShell
      title="Release feed"
      nav={[
        { href: "/dashboard/dj", label: "Home" },
        { href: "/releases", label: "Releases" },
      ]}
    >
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {releases === null ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : releases.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-soft">
              No service packs published yet. When labels &amp; artists upload their first packs,
              they&apos;ll show up here for verified DJs to grab.
            </p>
            <Button variant="secondary" className="mt-4">
              <Link href="/onboarding/artist">Are you a label? Publish a pack</Link>
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {releases.map((r) => (
            <Link key={r.releaseId} href={`/releases/${r.releaseId}`} className="group">
              <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
                {/* 2026-09-27 01:55, cover art (placeholder initials when none) */}
                <div className="aspect-square bg-charcoal">
                  {r.hasCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/releases/${r.releaseId}/cover`}
                      alt={`${r.songTitle} cover art`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <span className="text-3xl font-black text-brand-400">
                        {r.songTitle.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle>{r.songTitle}</CardTitle>
                  <p className="text-xs text-ink-soft">{r.artistName}</p>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-ink-soft">
                    {r.genre.join(", ") || "—"}
                    {r.bpm ? ` · ${r.bpm} BPM` : ""}
                    {r.musicalKey ? ` · ${r.musicalKey}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-ink/50">
                    {r.trackCount} edit{r.trackCount === 1 ? "" : "s"}
                  </p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}