"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, getIdToken, updateProfile } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Honeypot, Turnstile, TURNSTILE_SITE_KEY } from "@/components/Turnstile";
import { PLANS, formatPlanPrice, type Plan } from "@/lib/types";

type AccountRole = "artist" | "label";

// 2026-09-28 16:50, plan choices come straight from PLANS so signup never drifts from pricing
const TIERS: Record<AccountRole, { value: string; label: string; desc: string }[]> = {
  artist: PLANS.filter((p) => p.role === "artist").map(tierOption),
  label: PLANS.filter((p) => p.role === "label").map(tierOption),
};

function tierOption(p: Plan) {
  const price = p.price < 0 ? "Custom" : `${formatPlanPrice(p)}/mo`;
  return { value: p.id, label: p.name, desc: `${price} — ${p.features.join(", ")}` };
}

export default function ArtistOnboardingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AccountRole>("artist");
  const [plan, setPlan] = useState("artist-free");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 2026-09-28 19:30, bot guard: Turnstile token, honeypot, time-on-form (checked server-side)
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [website, setWebsite] = useState("");
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const waitingForCaptcha = Boolean(TURNSTILE_SITE_KEY) && !captcha;
  // 2026-09-28 18:30, arriving from an admin invite link (/invite/<token> → ?invite=<token>):
  // email + account type are fixed, and a comped plan skips payment.
  const [invite, setInvite] = useState<{ token: string; email: string; role: AccountRole; planId: string | null; comped: boolean } | null>(null);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite");
    if (!token) return;
    fetch(`/api/invites/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.invite || (d.invite.role !== "artist" && d.invite.role !== "label")) return;
        setInvite({ token, ...d.invite });
        setEmail(d.invite.email);
        setRole(d.invite.role);
        setPlan(d.invite.planId ?? (d.invite.role === "artist" ? "artist-free" : "label-starter"));
      })
      .catch(() => {});
  }, []);
  const planInfo = PLANS.find((p) => p.id === plan);
  const needsPayment = Boolean(planInfo && planInfo.price > 0 && !(invite?.comped && invite.planId === plan));

  const selectRole = (r: AccountRole) => {
    setRole(r);
    // 2026-09-28 15:50, labels default to the cheaper Label Starter
    setPlan(r === "artist" ? "artist-free" : "label-starter");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured — copy .env.local.example to .env.local first.");
      }
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      const idToken = await getIdToken(cred.user, true);

      const res = await fetch("/api/onboarding/artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          displayName,
          role,
          plan,
          inviteToken: invite?.token,
          turnstileToken: captcha,
          website,
          formStartedAt: startedAt.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      // 2026-09-28 18:30, paid plan: straight to Stripe Checkout (session cookie first — the
      // checkout API authenticates by cookie). If that fails the account still exists on Free.
      if (needsPayment) {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const co = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan, interval: "monthly" }),
        });
        const cd = await co.json().catch(() => ({}));
        if (co.ok && cd.url) {
          window.location.assign(cd.url);
          return;
        }
        router.push("/dashboard/billing");
        return;
      }
      router.push(role === "label" ? "/dashboard/label" : "/dashboard/artist");
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Signup failed");
      // the server discards a rejected signup's auth user; drop it client-side too
      if (isFirebaseConfigured()) await getFirebaseAuth().signOut().catch(() => {});
      setCaptchaReset((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex flex-1 justify-center bg-paper p-6">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Button size="sm" variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Label &amp; artist signup</CardTitle>
            <p className="mt-1 text-sm text-ink-soft">
              Create your account, then build your first service pack in minutes.
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Label / Artist name</Label>
                <Input
                  id="displayName"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Hotplate Records"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  readOnly={Boolean(invite)}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="a&r@hotplaterecords.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <Label>Account type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["artist", "label"] as AccountRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => selectRole(r)}
                      disabled={Boolean(invite) && invite?.role !== r}
                      className={`rounded-md border p-3 text-left text-sm font-semibold ${
                        role === r
                          ? "border-brand-500 bg-brand-500/10 text-ink"
                          : "border-ink/15 text-ink-soft hover:bg-paper-dark"
                      }`}
                    >
                      {r === "artist" ? "Artist" : "Label"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Plan</Label>
                <div className="space-y-2">
                  {TIERS[role].map((t) => (
                    <label
                      key={t.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                        plan === t.value
                          ? "border-brand-500 bg-brand-500/10"
                          : "border-ink/15 hover:bg-paper-dark"
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={t.value}
                        checked={plan === t.value}
                        onChange={() => setPlan(t.value)}
                        className="mt-1 accent-brand-600"
                      />
                      <span>
                        <span className="font-semibold text-ink">{t.label}</span>
                        {invite?.comped && invite.planId === t.value && (
                          <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-800">
                            Free for you
                          </span>
                        )}
                        <span className="mt-0.5 block text-xs text-ink-soft">{t.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Honeypot value={website} onChange={setWebsite} />
              <Turnstile onToken={setCaptcha} resetKey={captchaReset} />

              {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              <Button type="submit" className="w-full" size="lg" isLoading={busy} disabled={waitingForCaptcha}>
                {needsPayment ? "Create account & continue to payment" : "Create account"}
              </Button>

              <p className="text-center text-sm text-ink-soft">
                {needsPayment ? "Paid plans are billed securely by Stripe. " : "Free tier available. No card required to start. "}
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-brand-700 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}