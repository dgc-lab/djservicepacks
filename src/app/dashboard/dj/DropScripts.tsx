"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import type { DjScript } from "@/lib/types";

export function DropScripts() {
  const [scripts, setScripts] = useState<DjScript[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Add form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    fetch("/api/dj-scripts")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load your scripts");
        const d = (await r.json()) as { scripts: DjScript[] };
        setScripts(d.scripts ?? []);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dj-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || undefined, body }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save script");
      setScripts((s) => [d.script, ...(s ?? [])]);
      setTitle("");
      setBody("");
      setAdding(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (s: DjScript) => {
    setEditId(s.scriptId);
    setEditTitle(s.title ?? "");
    setEditBody(s.body);
  };

  const handleEdit = async (id: string, e: FormEvent) => {
    e.preventDefault();
    if (!editBody.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dj-scripts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle || null, body: editBody.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not update script");
      setScripts((s) =>
        (s ?? []).map((x) =>
          x.scriptId === id ? { ...x, title: editTitle || null, body: editBody.trim() } : x
        )
      );
      setEditId(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this drop script?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/dj-scripts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete script");
      setScripts((s) => (s ?? []).filter((x) => x.scriptId !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (scripts === null) return <p className="text-sm text-ink-soft">Loading your drop scripts…</p>;

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-ink">My drop scripts</h3>
        <Button type="button" variant="secondary" size="sm" onClick={() => setAdding((a) => !a)}>
          {adding ? "Cancel" : "+ New script"}
        </Button>
      </div>

      <p className="mb-4 text-sm text-ink-soft">
        These are your broadcast liners — a label can pick one and record a voiced version of it
        for you to use on air. They&apos;re shown with your name and station.
      </p>

      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 space-y-3 rounded-md border border-brand-500/40 bg-paper-dark p-3">
          <div>
            <Label htmlFor="ns-title">Label (optional)</Label>
            <Input
              id="ns-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning drive intro"
            />
          </div>
          <div>
            <Label htmlFor="ns-body">Drop script</Label>
            <Textarea
              id="ns-body"
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="You're locked into DJ Surge on KABQ-FM…"
            />
          </div>
          <Button type="submit" isLoading={busy}>Save script</Button>
        </form>
      )}

      {scripts.length === 0 && !adding ? (
        <p className="text-sm text-ink-soft">
          No scripts yet. Write your first drop script so a label can voice it for your broadcast.
        </p>
      ) : (
        <ul className="space-y-3">
          {scripts.map((s) => {
            const editing = editId === s.scriptId;
            return (
              <li key={s.scriptId} className="rounded-md border border-ink/10 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {s.djLabel}
                  </span>
                  <div className="flex gap-2">
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(s.scriptId)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editing ? (
                  <form onSubmit={(e) => handleEdit(s.scriptId, e)} className="space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Label (optional)"
                    />
                    <Textarea rows={3} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" isLoading={busy}>Save</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div>
                    {s.title && <p className="text-sm font-semibold text-ink">{s.title}</p>}
                    <p className="mt-1 text-sm whitespace-pre-wrap text-ink-soft">{s.body}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}