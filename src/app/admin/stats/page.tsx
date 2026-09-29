// 2026-09-28 13:15, admin stats: users, DJ approvals, activity, plays/downloads, top releases.
// Admin activity is excluded from engagement numbers (it's logged, but never counted).
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/lib/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { TRACK_TYPE_LABELS, type TrackType } from "@/lib/types";
import type { TrackEvent } from "@/lib/tracking";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

function Tile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink/50">{sub}</p>}
    </div>
  );
}

/** All reads + aggregation (kept out of the component body: it depends on the clock). */
async function loadStats() {
  const db = getAdminDb();
  const now = Date.now();
  const since7 = now - 7 * DAY;
  const since30 = now - 30 * DAY;

  const [usersSnap, authList, releasesSnap, eventsSnap, importsCount] = await Promise.all([
    db.collection("users").get(),
    getAdminAuth().listUsers(1000),
    db.collection("releases").get(),
    db.collection("events").where("at", ">=", new Date(since30).toISOString()).get(),
    db.collection("imports").count().get(),
  ]);

  // ---- users -----------------------------------------------------------
  const authMeta = new Map(authList.users.map((u) => [u.uid, u.metadata]));
  const users = usersSnap.docs.map((d) => {
    const u = d.data();
    const m = authMeta.get(d.id);
    return {
      uid: d.id,
      name: (u.djProfile?.djName as string) || (u.displayName as string) || u.email || d.id,
      email: u.email as string | null,
      role: (u.role as string) ?? "unknown",
      djStatus: u.djProfile?.verificationStatus as string | undefined,
      createdAt: u.createdAt as string | undefined,
      lastActive: m?.lastRefreshTime ?? m?.lastSignInTime ?? null,
    };
  });
  const nonAdmin = users.filter((u) => u.role !== "admin" && !/@djservicepacks\.test$/.test(u.email ?? ""));
  const byRole = (r: string) => nonAdmin.filter((u) => u.role === r).length;
  const djs = nonAdmin.filter((u) => u.role === "dj");
  const signups = (since: number) => nonAdmin.filter((u) => u.createdAt && Date.parse(u.createdAt) >= since).length;
  const active = (since: number) => nonAdmin.filter((u) => u.lastActive && Date.parse(u.lastActive) >= since).length;
  const recentUsers = [...nonAdmin].sort((a, b) => ((a.createdAt ?? "") < (b.createdAt ?? "") ? 1 : -1)).slice(0, 10);
  const nameOf = new Map(users.map((u) => [u.uid, u.name]));

  // ---- releases ----------------------------------------------------------
  const releases = releasesSnap.docs.map((d) => {
    const r = d.data();
    return {
      id: d.id,
      title: r.songTitle as string,
      artist: r.artistName as string,
      status: r.status as string,
      box: Boolean(r.importSource),
      plays: (r.stats?.plays as number) ?? 0,
      downloads: (r.stats?.downloads as number) ?? 0,
    };
  });
  const live = releases.filter((r) => r.status === "live");
  const titleOf = new Map(releases.map((r) => [r.id, `${r.artist} — ${r.title}`]));
  const allPlays = releases.reduce((s, r) => s + r.plays, 0);
  const allDownloads = releases.reduce((s, r) => s + r.downloads, 0);
  const top = [...releases]
    .filter((r) => r.plays + r.downloads > 0)
    .sort((a, b) => b.plays + b.downloads - (a.plays + a.downloads))
    .slice(0, 10);

  // ---- events (last 30 days, admins excluded) ----------------------------
  const events = eventsSnap.docs.map((d) => d.data() as TrackEvent).filter((e) => e.role !== "admin");
  const count = (type: string, since: number) => events.filter((e) => e.type === type && Date.parse(e.at) >= since).length;
  const byType = new Map<string, { plays: number; downloads: number }>();
  for (const e of events) {
    const k = e.trackType ?? "other";
    const v = byType.get(k) ?? { plays: 0, downloads: 0 };
    if (e.type === "play") v.plays++;
    else v.downloads++;
    byType.set(k, v);
  }
  const typeRows = [...byType.entries()].sort((a, b) => b[1].plays + b[1].downloads - (a[1].plays + a[1].downloads));
  const typeMax = Math.max(1, ...typeRows.map(([, v]) => v.plays + v.downloads));
  const recentEvents = [...events].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 20);

  return {
    djs, byRole, signups: [signups(since7), signups(since30)], active: [active(since7), active(since30)],
    plays: [count("play", since7), count("play", since30)], downloads: [count("download", since7), count("download", since30)],
    allPlays, allDownloads, top, typeRows, typeMax, recentEvents, recentUsers, nameOf, titleOf,
    releases, live, importRuns: importsCount.data().count,
  };
}

export default async function AdminStatsPage() {
  await requirePageRole("/admin/stats", "admin");
  const {
    djs, byRole, signups, active, plays, downloads, allPlays, allDownloads, top, typeRows, typeMax,
    recentEvents, recentUsers, nameOf, titleOf, releases, live, importRuns,
  } = await loadStats();

  return (
    <DashboardShell title="Site stats" nav={[{ href: "/admin", label: "Pending approvals" }]}>
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-brand-700">People</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="DJs" value={djs.length} sub={`${djs.filter((d) => d.djStatus === "approved").length} approved · ${djs.filter((d) => d.djStatus === "pending").length} pending`} />
            <Tile label="Artists / labels" value={byRole("artist") + byRole("label")} sub={`${byRole("artist")} artists · ${byRole("label")} labels`} />
            <Tile label="Signups" value={signups[0]} sub={`last 7 days · ${signups[1]} in 30`} />
            <Tile label="Active users" value={active[0]} sub={`last 7 days · ${active[1]} in 30`} />
          </div>
          {djs.some((d) => d.djStatus === "pending") && (
            <p className="mt-2 text-sm">
              <Link href="/admin" className="font-semibold text-brand-700 underline">
                {djs.filter((d) => d.djStatus === "pending").length} DJ(s) waiting for approval →
              </Link>
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-brand-700">Listening</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Plays" value={plays[0]} sub={`last 7 days · ${plays[1]} in 30`} />
            <Tile label="Downloads" value={downloads[0]} sub={`last 7 days · ${downloads[1]} in 30`} />
            <Tile label="Plays (all time)" value={allPlays} />
            <Tile label="Downloads (all time)" value={allDownloads} />
          </div>
          <p className="mt-2 text-xs text-ink/50">Tracking started Sep 28, 2026. Admin plays and downloads aren&apos;t counted.</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top releases</CardTitle>
            </CardHeader>
            <CardBody>
              {top.length === 0 ? (
                <p className="text-sm text-ink-soft">No plays or downloads yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink/50">
                      <th className="pb-2 font-medium">Release</th>
                      <th className="pb-2 text-right font-medium">Plays</th>
                      <th className="pb-2 text-right font-medium">Downloads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((r) => (
                      <tr key={r.id} className="border-t border-ink/5">
                        <td className="py-1.5 pr-2">
                          <Link href={`/releases/${r.id}`} className="hover:underline">
                            {r.artist} — {r.title}
                          </Link>
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{r.plays}</td>
                        <td className="py-1.5 text-right tabular-nums">{r.downloads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By edit type · last 30 days</CardTitle>
            </CardHeader>
            <CardBody>
              {typeRows.length === 0 ? (
                <p className="text-sm text-ink-soft">No plays or downloads yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {typeRows.map(([k, v]) => (
                    <li key={k}>
                      <div className="flex justify-between">
                        <span>{TRACK_TYPE_LABELS[k as TrackType] ?? k}</span>
                        <span className="tabular-nums text-ink-soft">
                          {v.plays} plays · {v.downloads} dl
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-paper-dark">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${((v.plays + v.downloads) / typeMax) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardBody>
              {recentEvents.length === 0 ? (
                <p className="text-sm text-ink-soft">Nothing yet.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {recentEvents.map((e, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-28 shrink-0 text-xs text-ink/50">{fmt(e.at)}</span>
                      <span className="min-w-0">
                        <b>{nameOf.get(e.uid) ?? "someone"}</b> {e.type === "play" ? "played" : "downloaded"}{" "}
                        <span className="text-ink-soft">{e.trackType ? TRACK_TYPE_LABELS[e.trackType] : ""}</span> ·{" "}
                        <Link href={`/releases/${e.releaseId}`} className="hover:underline">
                          {titleOf.get(e.releaseId) ?? e.releaseId}
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent signups</CardTitle>
            </CardHeader>
            <CardBody>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink/50">
                    <th className="pb-2 font-medium">Who</th>
                    <th className="pb-2 font-medium">Joined</th>
                    <th className="pb-2 font-medium">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => (
                    <tr key={u.uid} className="border-t border-ink/5 align-top">
                      <td className="py-1.5 pr-2">
                        <b>{u.name}</b>
                        <span className="block text-xs text-ink-soft">
                          {u.role}
                          {u.djStatus ? ` · ${u.djStatus}` : ""}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2 text-xs">{fmt(u.createdAt)}</td>
                      <td className="py-1.5 text-xs">{fmt(u.lastActive ? new Date(u.lastActive).toISOString() : null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-brand-700">Catalog</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Live releases" value={live.length} sub={`${releases.length - live.length} draft`} />
            <Tile label="Hosted on Box" value={live.filter((r) => r.box).length} />
            <Tile label="Uploaded to B2" value={live.filter((r) => !r.box).length} />
            <Tile label="Box import runs" value={importRuns} />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
