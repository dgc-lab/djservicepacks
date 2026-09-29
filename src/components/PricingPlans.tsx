"use client";
// 2026-09-27 01:35, plan cards (moved off the landing page). Rendered from PLANS so prices never
// drift from the gate.
// 2026-09-28 18:15, live upgrades: "Choose" starts Stripe Checkout (or switches an existing
// subscription), monthly/yearly toggle, cards filtered to the viewer's role.
import { useState } from "react";
import { PLANS, STORAGE_ADDON, YEARLY_MONTHS, formatPlanPrice, type Plan } from "@/lib/types";

export function PricingPlans({
  currentPlanId,
  role,
}: {
  currentPlanId?: string | null;
  /** only show this role's plans (artist or label); all plans when omitted */
  role?: string | null;
}) {
  const [interval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plans = PLANS.filter((p) => !role || role === "admin" || p.role === role);

  const choose = async (p: Plan) => {
    setError(null);
    setBusy(p.id);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: p.id, interval }),
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error || "Couldn't start checkout");
      window.location.assign(d.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  const price = (p: Plan) => {
    if (p.price <= 0) return { main: formatPlanPrice(p), unit: p.price === 0 ? "/mo" : "" };
    if (interval === "yearly") return { main: `$${(p.price * YEARLY_MONTHS).toFixed(2)}`, unit: "/yr" };
    return { main: formatPlanPrice(p), unit: "/mo" };
  };

  return (
    <div>
      <div className="mb-4 inline-flex rounded-md border border-ink/15 bg-white p-0.5 text-sm">
        {(["monthly", "yearly"] as const).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setBillingInterval(i)}
            className={`rounded px-3 py-1.5 font-semibold ${interval === i ? "bg-ink text-paper" : "text-ink-soft"}`}
          >
            {i === "monthly" ? "Monthly" : `Yearly · ${12 - YEARLY_MONTHS} months free`}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const current = p.id === currentPlanId;
          const highlight = p.id === "artist-pro" || p.id === "label";
          const pr = price(p);
          return (
            <div
              key={p.id}
              className={
                highlight
                  ? "flex flex-col rounded-xl border-2 border-brand-500 bg-ink p-5 text-paper"
                  : "flex flex-col rounded-xl border border-ink/10 bg-white p-5"
              }
            >
              <p className={`text-xs font-bold uppercase tracking-widest ${highlight ? "text-brand-400" : "text-ink-soft"}`}>
                {p.name}
              </p>
              <p className={`mt-2 text-2xl font-black ${highlight ? "" : "text-ink"}`}>
                {pr.main}
                <span className={`text-sm font-semibold ${highlight ? "text-paper/60" : "text-ink-soft"}`}>{pr.unit}</span>
              </p>
              <ul className={`mt-3 flex-1 space-y-1.5 text-sm ${highlight ? "text-paper/75" : "text-ink-soft"}`}>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {current ? (
                <p className="mt-4 rounded-md bg-brand-500/15 px-3 py-2 text-center text-xs font-semibold text-brand-700">
                  Your current plan
                </p>
              ) : p.price === 0 ? (
                <p className="mt-4 rounded-md bg-paper-dark px-3 py-2 text-center text-xs font-semibold text-ink-soft">Free</p>
              ) : p.price < 0 ? (
                <a
                  href="mailto:admin@djservicepacks.com?subject=Enterprise%20plan"
                  className="mt-4 rounded-md border border-current px-3 py-2 text-center text-xs font-semibold"
                >
                  Contact us
                </a>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => choose(p)}
                  className={`mt-4 rounded-md px-3 py-2 text-center text-xs font-bold disabled:opacity-60 ${
                    highlight ? "bg-brand-500 text-ink hover:bg-brand-400" : "bg-ink text-paper hover:bg-ink/85"
                  }`}
                >
                  {busy === p.id ? "Opening checkout…" : `Choose ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="mt-3 text-xs text-ink-soft">
        Secure checkout by Stripe. Cancel any time. Need more room? Add{" "}
        {Math.round(STORAGE_ADDON.bytes / 1024 ** 3)} GB for ${STORAGE_ADDON.price.toFixed(2)}/mo at checkout on any hosted
        plan.
      </p>
    </div>
  );
}
