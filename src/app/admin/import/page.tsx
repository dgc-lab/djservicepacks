"use client";

// 2026-09-28 01:15, admin Box import: paste an email → preview packs → publish.
// Also the review queue for packs that arrived via the import mailbox.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { TRACK_TYPE_LABELS, type TrackType } from "@/lib/types";

interface Plan {
  entry: { artist: string; title: string; shared: string };
  cover: { name: string } | null;
  coverUrl: string | null;
  tracks: { type: TrackType; label: string | null; name: string }[];
  skipped: string[];
  otherFiles: number;
  existingReleaseId: string | null;
  error: string | null;
}
interface Result {
  artist: string;
  title: string;
  releaseId: string | null;
  status: "created" | "exists" | "error";
  message?: string;
}
interface Draft {
  releaseId: string;
  via: "mailbox" | "admin";
  artistName: string;
  songTitle: string;
  edits: number;
  createdAt: string;
}
interface Run {
  id: string;
  via: "admin" | "mailbox";
  from?: string;
  by?: string;
  subject?: string;
  outcome?: string;
  status?: string;
  results?: Result[];
  createdAt: string;
}

const importable = (p: Plan) => !p.existingReleaseId && !p.error && p.tracks.length > 0;

export default function AdminImportPage() {
  const [text, setText] = useState("");
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 2026-09-28 01:25, fix typos in artist/title before publishing
  const [overrides, setOverrides] = useState<Record<string, { artist: string; title: string }>>({});
  const [status, setStatus] = useState<"live" | "draft">("live");
  const [busy, setBusy] = useState<null | "preview" | "publish">(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);

  const loadQueue = useCallback(async () => {
    const r = await fetch("/api/admin/import");
    if (r.ok) {
      const d = (await r.json()) as { drafts: Draft[]; runs: Run[] };
      setDrafts(d.drafts);
      setRuns(d.runs);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of the review queue
    loadQueue();
  }, [loadQueue]);

  const call = async (action: "preview" | "publish") => {
    setBusy(action);
    setError(null);
    try {
      const r = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text, shareds: [...selected], status, overrides }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Import failed");
      if (action === "preview") {
        setPlans(d.plans);
        setResults(null);
        setOverrides(
          Object.fromEntries((d.plans as Plan[]).map((p) => [p.entry.shared, { artist: p.entry.artist, title: p.entry.title }]))
        );
        setSelected(new Set((d.plans as Plan[]).filter(importable).map((p) => p.entry.shared)));
      } else {
        setResults(d.results);
        setPlans(null);
        loadQueue();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const draftAction = async (releaseId: string, action: "publish" | "discard") => {
    const r = await fetch("/api/admin/import/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId, action }),
    });
    if (r.ok) loadQueue();
  };

  const toggle = (shared: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(shared)) n.delete(shared);
      else n.add(shared);
      return n;
    });

  return (
    <DashboardShell title="Import packs from Box" nav={[{ href: "/admin", label: "Pending approvals" }]}>
      <div className="max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Paste an email</CardTitle>
            <p className="text-sm text-ink-soft">
              Each song needs an <b>Artist “Title”</b> line followed by its <b>box.com/s/…</b> folder link. Covers and
              edits are read from the Box folder; audio streams from Box.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={"Fuego the Profit “Swag Baby”\nhttps://app.box.com/s/…"}
              className="w-full rounded-md border border-ink/15 bg-white p-3 font-mono text-sm"
            />
            <Button onClick={() => call("preview")} disabled={!text.trim() || busy !== null}>
              {busy === "preview" ? "Reading Box folders…" : "Preview"}
            </Button>
          </CardBody>
        </Card>

        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {plans && (
          <Card>
            <CardHeader>
              <CardTitle>
                {plans.length} pack{plans.length === 1 ? "" : "s"} found · {selected.size} selected
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {plans.map((p) => (
                <label
                  key={p.entry.shared}
                  className={`flex gap-3 rounded-lg border p-3 ${importable(p) ? "border-ink/10" : "border-ink/5 opacity-60"}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    disabled={!importable(p)}
                    checked={selected.has(p.entry.shared)}
                    onChange={() => toggle(p.entry.shared)}
                  />
                  {p.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverUrl} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded bg-charcoal text-xs text-brand-400">
                      no cover
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {importable(p) ? (
                      <div className="flex flex-wrap gap-2" onClick={(e) => e.preventDefault()}>
                        {(["artist", "title"] as const).map((k) => (
                          <input
                            key={k}
                            aria-label={k}
                            value={overrides[p.entry.shared]?.[k] ?? p.entry[k]}
                            onChange={(e) =>
                              setOverrides((o) => ({
                                ...o,
                                [p.entry.shared]: { ...(o[p.entry.shared] ?? p.entry), [k]: e.target.value },
                              }))
                            }
                            className={`h-8 min-w-0 rounded border border-ink/15 px-2 text-sm ${k === "artist" ? "flex-1 font-semibold" : "flex-1 font-bold"}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-ink">
                        {p.entry.artist} — {p.entry.title}
                      </p>
                    )}
                    {p.existingReleaseId && (
                      <p className="text-xs text-ink-soft">
                        Already imported ·{" "}
                        <Link href={`/releases/${p.existingReleaseId}`} className="text-brand-700 underline">
                          view
                        </Link>
                      </p>
                    )}
                    {p.error && <p className="text-xs text-red-600">{p.error}</p>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.tracks.map((t) => (
                        <span key={t.name} title={t.name} className="rounded bg-paper-dark px-1.5 py-0.5 text-[11px] text-ink-soft">
                          {t.label || TRACK_TYPE_LABELS[t.type]}
                        </span>
                      ))}
                    </div>
                    {p.skipped.length > 0 && (
                      <p className="mt-1 text-xs text-amber-700">Not recognized: {p.skipped.join(" · ")}</p>
                    )}
                    {p.otherFiles > 0 && (
                      <p className="mt-1 text-[11px] text-ink/40">{p.otherFiles} other file(s) (WAV/video/PDF) not imported</p>
                    )}
                  </div>
                </label>
              ))}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "live" | "draft")}
                  className="h-10 rounded-md border border-ink/15 bg-white px-3 text-sm"
                >
                  <option value="live">Publish live</option>
                  <option value="draft">Save as drafts</option>
                </select>
                <Button onClick={() => call("publish")} disabled={!selected.size || busy !== null}>
                  {busy === "publish" ? "Importing…" : `Import ${selected.size} pack${selected.size === 1 ? "" : "s"}`}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Import finished</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-1 text-sm">
                {results.map((r) => (
                  <li key={`${r.artist}-${r.title}`}>
                    {r.status === "created" ? "✅" : r.status === "exists" ? "↺" : "⚠️"} {r.artist} — {r.title}{" "}
                    {r.releaseId && (
                      <Link href={`/releases/${r.releaseId}`} className="text-brand-700 underline">
                        view
                      </Link>
                    )}
                    {r.message && <span className="text-red-600"> {r.message}</span>}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Waiting for review ({drafts.length})</CardTitle>
            <p className="text-sm text-ink-soft">
              Imported drafts (from the import mailbox, or saved as drafts here). Open one to check it, then publish.
            </p>
          </CardHeader>
          <CardBody>
            {drafts.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing waiting.</p>
            ) : (
              <ul className="divide-y divide-ink/5">
                {drafts.map((d) => (
                  <li key={d.releaseId} className="flex flex-wrap items-center gap-3 py-2">
                    <Link href={`/releases/${d.releaseId}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-ink hover:underline">
                      {d.artistName} — {d.songTitle}
                    </Link>
                    <span className="text-xs text-ink-soft">
                      {d.via === "mailbox" ? "📧 email" : "🖐 manual"} · {d.edits} edits
                    </span>
                    <Button size="sm" onClick={() => draftAction(d.releaseId, "publish")}>
                      Publish
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => draftAction(d.releaseId, "discard")}>
                      Discard
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {runs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent imports</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-1 text-xs text-ink-soft">
                {runs.map((r) => (
                  <li key={r.id}>
                    {new Date(r.createdAt).toLocaleString()} ·{" "}
                    {r.via === "mailbox" ? `📧 ${r.from} “${r.subject}” — ${r.outcome}` : `🖐 ${r.by} — ${r.results?.filter((x) => x.status === "created").length ?? 0} imported (${r.status})`}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
