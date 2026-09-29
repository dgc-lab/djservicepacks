"use client";

// 2026-09-29 Round 9: extracted from src/app/onboarding/dj/page.tsx so the same form
// renders both on the /onboarding/dj page and inside the homepage modal.
// Onboarding logic is byte-identical to the page version — only the styling went
// dark to match the site aesthetic.

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, getIdToken, updateProfile } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { PlatformType } from "@/lib/types";
import { Honeypot, Turnstile, TURNSTILE_SITE_KEY } from "@/components/Turnstile";

const PLATFORMS: { value: PlatformType; label: string; hint: string }[] = [
  {
    value: "terrestrial_radio",
    label: "Terrestrial Radio",
    hint: "Station call letters (e.g. KABQ-FM) + station link/address",
  },
  {
    value: "club_venue",
    label: "Club / Venue",
    hint: "Venue name, location, and a resident schedule link",
  },
  {
    value: "digital_satellite",
    label: "Digital / Satellite",
    hint: "Active stream URL or Mixcloud / SoundCloud profile",
  },
];

export function DjOnboardingForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [djName, setDjName] = useState("");
  const [platformType, setPlatformType] = useState<PlatformType>("terrestrial_radio");
  const [stationCallLetters, setStationCallLetters] = useState("");
  const [venueOrUrl, setVenueOrUrl] = useState("");
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
  // 2026-09-28 18:30, admin invite link → email fixed; a pre-approved invite skips the queue
  const [invite, setInvite] = useState<{ token: string; email: string; preApproved: boolean } | null>(null);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite");
    if (!token) return;
    fetch(`/api/invites/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.invite?.role !== "dj") return;
        setInvite({ token, email: d.invite.email, preApproved: d.invite.preApproved });
        setEmail(d.invite.email);
      })
      .catch(() => {});
  }, []);

  const isTerrestrial = platformType === "terrestrial_radio";
  const secondFieldLabel = isTerrestrial ? "Station call letters" : "Venue / URL";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!isFirebaseConfigured()) {
        throw new Error(
          "Firebase is not configured — copy .env.local.example to .env.local first."
        );
      }
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      const idToken = await getIdToken(cred.user, true);

      const res = await fetch("/api/onboarding/dj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          displayName,
          djName,
          platformType,
          stationCallLetters: isTerrestrial ? stationCallLetters : undefined,
          venueOrUrl: isTerrestrial ? undefined : venueOrUrl,
          inviteToken: invite?.token,
          turnstileToken: captcha,
          website,
          formStartedAt: startedAt.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onboarding failed");
      router.push(data.status === "approved" ? "/releases" : "/dashboard/dj?pending=1");
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
    <div className="overflow-hidden rounded-2xl border border-paper/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl">
      <div className="border-b border-paper/10 px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-paper">DJ onboarding</h3>
          <span className="shrink-0 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300">
            Free · DJ verification
          </span>
        </div>
        <p className="mt-1 text-sm text-paper/55">
          Free registration. Your details are checked by admin before you unlock high-bitrate
          downloads.
        </p>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="displayName" className="text-paper/70">Full name</Label>
              <Input
                id="displayName"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jordan Reyes"
                className="border-paper/15 bg-white/5 text-paper placeholder:text-paper/35"
              />
            </div>
            <div>
              <Label htmlFor="djName" className="text-paper/70">Professional DJ name</Label>
              <Input
                id="djName"
                required
                value={djName}
                onChange={(e) => setDjName(e.target.value)}
                placeholder="DJ Surge"
                className="border-paper/15 bg-white/5 text-paper placeholder:text-paper/35"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-paper/70">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              readOnly={Boolean(invite)}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dj@yourstation.com"
              className="border-paper/15 bg-white/5 text-paper placeholder:text-paper/35"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-paper/70">Password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="border-paper/15 bg-white/5 text-paper placeholder:text-paper/35"
            />
          </div>

          <div>
            <Label className="text-paper/70">Primary platform type</Label>
            <div className="space-y-2">
              {PLATFORMS.map((p) => (
                <label
                  key={p.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
                    platformType === p.value
                      ? "border-brand-500/70 bg-brand-500/10"
                      : "border-paper/15 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="platformType"
                    value={p.value}
                    checked={platformType === p.value}
                    onChange={() => setPlatformType(p.value)}
                    className="mt-1 h-4 w-4 accent-brand-500"
                  />
                  <span>
                    <span className="font-medium text-paper">{p.label}</span>
                    <span className="mt-0.5 block text-xs text-paper/55">{p.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="verificationField" className="text-paper/70">{secondFieldLabel}</Label>
            <Input
              id="verificationField"
              required
              value={isTerrestrial ? stationCallLetters : venueOrUrl}
              onChange={(e) =>
                isTerrestrial
                  ? setStationCallLetters(e.target.value)
                  : setVenueOrUrl(e.target.value)
              }
              placeholder={isTerrestrial ? "KABQ-FM" : "https://…"}
              className="border-paper/15 bg-white/5 text-paper placeholder:text-paper/35"
            />
          </div>

          <Honeypot value={website} onChange={setWebsite} />
          <Turnstile onToken={setCaptcha} resetKey={captchaReset} />

          {error && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" isLoading={busy} disabled={waitingForCaptcha}>
            Submit for verification
          </Button>

          <p className="text-center text-sm text-paper/55">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-400 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
