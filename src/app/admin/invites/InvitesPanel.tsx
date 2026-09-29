"use client";
// 2026-09-28 18:50, invite form + sent-invites list (resend / revoke)
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS, formatPlanPrice, type Invite } from "@/lib/types";

type Row = Invite & { expired: boolean };
type Role = Invite["role"];

const RESULT_TEXT: Record<string, string> = {
  sent: "sent",
  failed: "saved, but the email failed — check mail settings, then Resend",
  invalid: "not a valid email",
  "has-account": "already has an account",
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export function InvitesPanel() {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<Role>("dj");
  const [planId, setPlanId] = useState("");
  const [comped, setComped] = useState(false);
  const [preApproved, setPreApproved] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ email: string; result: string }[] | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/invites");
    if (r.ok) setRows((await r.json()).invites);
  }, []);
  useEffect(() => {
    fetch("/api/admin/invites")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRows(d.invites))
      .catch(() => {});
  }, []);

  const plans = PLANS.filter((p) => p.role === role);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResults(null);
    const r = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails, role, planId: planId || null, comped, preApproved, note }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setResults(d.results);
      if (d.results.every((x: { result: string }) => x.result === "sent")) setEmails("");
      void load();
    } else setError(d.error || "Couldn't send");
    setBusy(false);
  };

  const act = async (id: string, method: "POST" | "DELETE") => {
    const r = await fetch(`/api/admin/invites/${id}`, { method });
    if (!r.ok) setError((await r.json().catch(() => ({}))).error || "Action failed");
    void load();
  };

  const status = (i: Row) =>
    i.status === "accepted"
      ? { t: `accepted ${fmt(i.acceptedAt)}`, c: "bg-green-100 text-green-800" }
      : i.status === "revoked"
        ? { t: "revoked", c: "bg-paper-dark text-ink-soft" }
        : i.expired
          ? { t: "expired", c: "bg-paper-dark text-ink-soft" }
          : i.status === "failed"
            ? { t: "email failed", c: "bg-red-100 text-red-700" }
            : { t: `sent ${fmt(i.sentAt)}${i.sendCount > 1 ? ` (×${i.sendCount})` : ""}`, c: "bg-brand-500/15 text-brand-700" };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Send invites</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={submit} className="space-y-4 text-sm">
            <div>
              <Label htmlFor="emails">Email addresses</Label>
              <textarea
                id="emails"
                required
                rows={4}
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder={"one@station.com\nanother@label.com"}
                className="w-full rounded-md border border-ink/15 bg-white p-3 text-sm text-ink"
              />
              <p className="mt-1 text-xs text-ink-soft">One per line or comma-separated (up to 50).</p>
            </div>
            <div>
              <Label>Invite as</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["dj", "artist", "label"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setPlanId("");
                      setComped(false);
                    }}
                    className={`rounded-md border p-2 font-semibold ${
                      role === r ? "border-brand-500 bg-brand-500/10 text-ink" : "border-ink/15 text-ink-soft"
                    }`}
                  >
                    {r === "dj" ? "DJ" : r === "artist" ? "Artist" : "Label"}
                  </button>
                ))}
              </div>
            </div>
            {role === "dj" ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={preApproved} onChange={(e) => setPreApproved(e.target.checked)} className="accent-brand-600" />
                Pre-approve (skip the verification queue)
              </label>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="plan">Plan (optional)</Label>
                <select
                  id="plan"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="h-10 w-full rounded-md border border-ink/15 bg-white px-2 text-ink"
                >
                  <option value="">They choose at signup</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price > 0 ? `${formatPlanPrice(p)}/mo` : formatPlanPrice(p)}
                    </option>
                  ))}
                </select>
                {planId && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={comped} onChange={(e) => setComped(e.target.checked)} className="accent-brand-600" />
                    Free for them (comp this plan — no payment)
                  </label>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="note">Personal note (optional)</Label>
              <textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Hey — we'd love to have your show on the platform…"
                className="w-full rounded-md border border-ink/15 bg-white p-3 text-sm text-ink"
              />
              <p className="mt-1 text-xs text-ink-soft">Replies go to your email address.</p>
            </div>
            {error && <p className="rounded-md bg-red-50 p-3 text-red-700">{error}</p>}
            {results && (
              <ul className="space-y-1 rounded-md bg-paper-dark p-3 text-xs">
                {results.map((r) => (
                  <li key={r.email}>
                    <b>{r.email}</b> — {RESULT_TEXT[r.result] ?? r.result}
                  </li>
                ))}
              </ul>
            )}
            <Button type="submit" className="w-full" isLoading={busy}>
              Send invite{emails.split(/[\s,;]+/).filter(Boolean).length > 1 ? "s" : ""}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent invites</CardTitle>
        </CardHeader>
        <CardBody>
          {rows === null ? (
            <p className="text-sm text-ink-soft">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-ink-soft">No invites yet.</p>
          ) : (
            <ul className="divide-y divide-ink/5 text-sm">
              {rows.map((i) => {
                const s = status(i);
                const plan = PLANS.find((p) => p.id === i.planId);
                return (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{i.email}</p>
                      <p className="text-xs text-ink-soft">
                        {i.role === "dj" ? `DJ${i.preApproved ? " · pre-approved" : ""}` : i.role}
                        {plan ? ` · ${plan.name}${i.comped ? " (comped)" : ""}` : ""} · by {i.invitedBy}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${s.c}`}>{s.t}</span>
                      {i.status !== "accepted" && (
                        <button type="button" onClick={() => act(i.id, "POST")} className="text-xs font-medium text-brand-700 hover:underline">
                          Resend
                        </button>
                      )}
                      {i.status !== "accepted" && i.status !== "revoked" && (
                        <button type="button" onClick={() => act(i.id, "DELETE")} className="text-xs text-red-600 hover:underline">
                          Revoke
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
