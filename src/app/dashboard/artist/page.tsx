import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/lib/session";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { Release } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ArtistDashboardPage() {
  // 2026-09-27 01:05, redirect (not 500) when logged out / session expired
  const user = await requirePageRole("/dashboard/artist", "artist", "label", "admin");
  const snap = await getAdminDb()
    .collection("releases")
    .where("ownerId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const releases = snap.docs.map((d) => ({
    ...(d.data() as Release),
    releaseId: d.id,
  }));

  return (
    <DashboardShell
      title="My Releases"
      nav={[
        { href: "/dashboard/artist", label: "My releases" },
        { href: "/releases/new", label: "New release" },
      ]}
    >
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {releases.length} release{releases.length === 1 ? "" : "s"} published
        </p>
        <Button>
          <Link href="/releases/new">+ New release</Link>
        </Button>
      </div>

      {releases.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-zinc-500">
            No releases yet. Build your first service pack — pick &quot;New release&quot; to get
            started.
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {releases.map((r) => (
            <Card key={r.releaseId}>
              <CardHeader>
                <CardTitle>{r.songTitle}</CardTitle>
                <p className="text-xs text-zinc-500">{r.artistName}</p>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-zinc-600">
                  {r.genre.join(", ")}
                  {r.bpm ? ` · ${r.bpm} BPM` : ""}
                  {r.musicalKey ? ` · ${r.musicalKey}` : ""}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  {r.audioTracks.length} edit
                  {r.audioTracks.length === 1 ? "" : "s"} uploaded
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}