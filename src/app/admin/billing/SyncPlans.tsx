"use client";
// 2026-09-28 18:25, push PLANS (+ storage add-on) into Stripe as products/prices
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SyncPlans({ disabled }: { disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/billing", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) setLog(d.log);
    else setError(d.error || "Sync failed");
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <Button type="button" onClick={run} disabled={busy || disabled}>
        {busy ? "Syncing…" : "Sync plans to Stripe"}
      </Button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {log && (
        <pre className="max-h-64 overflow-auto rounded-md bg-paper-dark p-3 text-xs text-ink">{log.join("\n")}</pre>
      )}
    </div>
  );
}
