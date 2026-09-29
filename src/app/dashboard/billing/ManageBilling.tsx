"use client";
// 2026-09-28 18:20, opens the Stripe Billing Portal (card, invoices, cancel)
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ManageBilling() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.url) window.location.assign(d.url);
    else {
      setError(d.error || "Couldn't open billing");
      setBusy(false);
    }
  };
  return (
    <div>
      <Button type="button" variant="secondary" onClick={open} disabled={busy}>
        {busy ? "Opening…" : "Manage billing & invoices"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
