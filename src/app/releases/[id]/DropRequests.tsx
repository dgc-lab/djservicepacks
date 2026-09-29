"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { DjScript, DropRequest, FileFormat, Role } from "@/lib/types";

interface DropRequestsProps {
  releaseId: string;
  viewerRole: Role | null;
  isOwner: boolean;
}

const STATUS_STYLES: Record<DropRequest["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  fulfilled: "bg-green-100 text-green-800",
  cancelled: "bg-ink/10 text-ink-soft",
};

function formatFromName(name: string): FileFormat | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "wav") return "wav";
  if (ext === "aiff" || ext === "aif") return "aiff";
  if (ext === "mp3") return "mp3";
  return null;
}

export function DropRequests({ releaseId, viewerRole, isOwner }: DropRequestsProps) {
  const router = useRouter();
  const isDj = viewerRole === "dj";
  const [requests, setRequests] = useState<DropRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // DJ-only: their own scripts to pick from, and the add-form toggle.
  const [scripts, setScripts] = useState<DjScript[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState("");

  // Owner-only: which pending request's file picker holds a selection, and
  // which one is mid-upload.
  const [recordFiles, setRecordFiles] = useState<Record<string, File | null>>({});
  const [recordingDropId, setRecordingDropId] = useState<string | null>(null);

  const canView = isDj || isOwner;

  useEffect(() => {
    if (!canView) return;
    fetch(`/api/releases/${releaseId}/drop-requests`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load drop requests");
        const d = (await r.json()) as { dropRequests: DropRequest[] };
        setRequests(d.dropRequests ?? []);
      })
      .catch((e) => setError((e as Error).message));
  }, [releaseId, canView]);

  useEffect(() => {
    if (!isDj) return;
    fetch("/api/dj-scripts")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load your scripts");
        const d = (await r.json()) as { scripts: DjScript[] };
        setScripts(d.scripts ?? []);
      })
      .catch((e) => setError((e as Error).message));
  }, [isDj]);

  if (!canView) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedScriptId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/releases/${releaseId}/drop-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId: selectedScriptId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not submit request");
      setRequests((r) => [d.dropRequest, ...(r ?? [])]);
      setSelectedScriptId("");
      setAdding(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (dropId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/releases/${releaseId}/drop-requests/${dropId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not cancel request");
      setRequests((r) =>
        (r ?? []).map((x) => (x.dropId === dropId ? { ...x, status: "cancelled" } : x))
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRecord = async (dropId: string) => {
    const file = recordFiles[dropId];
    if (!file) return;
    const fmt = formatFromName(file.name);
    if (!fmt) {
      setError(`Unsupported audio type on "${file.name}" — use WAV, AIFF or MP3.`);
      return;
    }
    setError(null);
    setRecordingDropId(dropId);
    try {
      const mintRes = await fetch(`/api/releases/${releaseId}/drop-requests/${dropId}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, sizeBytes: file.size, fmt }),
      });
      const minted = await mintRes.json();
      if (!mintRes.ok) throw new Error(minted.error || "Could not start upload");

      // 2026-09-27 00:45, match the Content-Type the server signed (browser guesses break the signature)
      const up = await fetch(minted.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": minted.contentType },
      });
      if (!up.ok) throw new Error("Upload failed");

      const confirmRes = await fetch(`/api/releases/${releaseId}/drop-requests/${dropId}/record`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey: minted.storageKey,
          fileFormat: minted.fileFormat,
          sizeBytes: minted.sizeBytes,
        }),
      });
      const confirmed = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmed.error || "Could not confirm recording");

      setRequests((r) => (r ?? []).filter((x) => x.dropId !== dropId));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRecordingDropId(null);
    }
  };

  return (
    <div className="mt-8 rounded-lg border border-ink/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">
          {isDj ? "My drop requests" : "Pending drop requests"}
        </h2>
        {isDj && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAdding((a) => !a)}
          >
            {adding ? "Cancel" : "+ Request a drop"}
          </Button>
        )}
      </div>

      {isDj && (
        <p className="mb-4 text-sm text-ink-soft">
          Ask the artist/label to record a voiced version of one of your scripts for this
          release.
        </p>
      )}

      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {isDj && adding && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 space-y-3 rounded-md border border-brand-500/40 bg-paper-dark p-3"
        >
          <select
            value={selectedScriptId}
            onChange={(e) => setSelectedScriptId(e.target.value)}
            required
            className="h-10 w-full rounded-md border border-ink/15 bg-white px-2 text-sm text-ink"
          >
            <option value="" disabled>
              Choose one of your scripts…
            </option>
            {(scripts ?? []).map((s) => (
              <option key={s.scriptId} value={s.scriptId}>
                {s.title || s.body.slice(0, 60)}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" isLoading={busy}>
            Submit request
          </Button>
        </form>
      )}

      {requests === null ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-ink-soft">
          {isDj
            ? "No drop requests yet. Pick one of your scripts above and ask the artist to record it."
            : "No pending drop requests for this release."}
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.dropId} className="rounded-md border border-ink/10 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {r.djLabel}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[r.status]}`}
                >
                  {r.status}
                </span>
              </div>
              {r.scriptTitle && <p className="text-sm font-semibold text-ink">{r.scriptTitle}</p>}
              <p className="mt-1 text-xs text-ink-soft italic line-clamp-2">“{r.scriptText}”</p>
              {isDj && r.status === "pending" && (
                <button
                  type="button"
                  onClick={() => handleCancel(r.dropId)}
                  className="mt-2 text-xs font-medium text-red-600 hover:underline"
                >
                  Cancel
                </button>
              )}
              {isOwner && r.status === "pending" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
                  <input
                    type="file"
                    accept=".wav,.aiff,.aif,.mp3,audio/*"
                    onChange={(e) =>
                      setRecordFiles((files) => ({
                        ...files,
                        [r.dropId]: e.target.files?.[0] ?? null,
                      }))
                    }
                    className="text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-paper-dark file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
                  />
                  <Button
                    type="button"
                    size="sm"
                    isLoading={recordingDropId === r.dropId}
                    disabled={!recordFiles[r.dropId]}
                    onClick={() => handleRecord(r.dropId)}
                  >
                    Upload recording
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
