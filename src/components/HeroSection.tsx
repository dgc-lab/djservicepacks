"use client";

// 2026-09-29 Round 4: hero with background image slider + a settings gear that
// opens live controls for headline typography and slider behavior.
import { AnimatePresence, motion } from "framer-motion";
import { Settings2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Motif } from "@/components/Motif";
import { CountUp } from "@/components/CountUp";
import { SponsorCredit } from "@/components/SponsorCredit";
import { AuroraText } from "@/components/godui/aurora-text";
import { PresenceFacepile, type PresenceUser } from "@/components/godui/presence/presence-facepile";
import { HeroSlider, type HeroSlide, type HeroTransition } from "@/components/HeroSlider";
import { OnboardingModal, type OnboardingKind } from "@/components/onboarding/OnboardingModal";

const slides: HeroSlide[] = [
  { src: "/images/hero-slider/slider-crates.webp", alt: "", label: "The crates" },
  { src: "/images/hero-slider/slider-gear.webp", alt: "", label: "The gear" },
  { src: "/images/hero-slider/slider-turntables.webp", alt: "", label: "The turntables" },
  { src: "/images/hero-slider/slider-radio.webp", alt: "", label: "The radio station" },
];

const djUsers: PresenceUser[] = [
  { id: "mira", name: "DJ Mira", avatar: "/images/djs/dj-mira.webp", status: "active" },
  { id: "kwest", name: "DJ Kwest", avatar: "/images/djs/dj-kwest.webp", status: "active" },
  { id: "luna", name: "DJ Luna", avatar: "/images/djs/dj-luna.webp", status: "typing" },
  { id: "paco", name: "DJ Paco", avatar: "/images/djs/dj-paco.webp", status: "idle" },
];

const stats = [
  { to: 6, label: "edits in every pack" },
  { to: 3, label: "formats — WAV · AIFF · 320 MP3" },
  { to: 2, label: "sides of the crate: labels & DJs" },
  { to: 1, label: "standard pack format" },
];

type HeadlineSize = "compact" | "classic" | "grand";
const HEADLINE_CLASS: Record<HeadlineSize, string> = {
  compact: "text-[clamp(2.5rem,6.5vw,4.25rem)]",
  classic: "text-[clamp(3.2rem,8.5vw,5.5rem)]",
  grand: "text-[clamp(3.9rem,10vw,7rem)]",
};

const SPEEDS = [
  { id: "relaxed", label: "Relaxed", ms: 8000 },
  { id: "steady", label: "Steady", ms: 5000 },
  { id: "brisk", label: "Brisk", ms: 3000 },
] as const;

// 2026-09-29 Round 10: hero operator controls, ported from the Prime Time
// module. Fade is the default; Ken Burns on; grain and parallax off.
const TRANSITIONS = [
  { id: "fade", label: "Fade" },
  { id: "slide", label: "Slide" },
  { id: "dip", label: "Dip to black" },
  { id: "punch", label: "Punch-in" },
] as const;

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="mt-2 flex w-full items-center justify-between rounded-lg bg-paper/5 px-3 py-2 text-sm transition-colors hover:bg-paper/10"
    >
      <span className="font-medium text-paper/80">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          value ? "bg-brand-500" : "bg-paper/20"
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function HeroSection() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [headlineSize, setHeadlineSize] = useState<HeadlineSize>("classic");
  const [autoplay, setAutoplay] = useState(true);
  const [speedId, setSpeedId] = useState<(typeof SPEEDS)[number]["id"]>("steady");
  const [transition, setTransition] = useState<HeroTransition>("fade");
  const [kenBurns, setKenBurns] = useState(true);
  const [filmGrain, setFilmGrain] = useState(false);
  const [parallax, setParallax] = useState(false);
  // 2026-09-29 Round 9: hero CTAs pop the onboarding forms in a modal over the
  // dark hero instead of navigating away to a separate page.
  const [onboarding, setOnboarding] = useState<OnboardingKind | null>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  // 2026-09-29 Round 10: hero settings persist through URL parameters, so a
  // tuned hero is shareable. Hydrated on mount in an effect (not a lazy
  // initializer) so the server prerender and first client render match —
  // window is unreadable during SSR. This is intentionally mount-only.
  /* eslint-disable react-hooks/set-state-in-effect -- mount-only URL hydration, see above */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("transition");
    if (t === "fade" || t === "slide" || t === "dip" || t === "punch") setTransition(t);
    if (q.get("kb") === "0") setKenBurns(false);
    if (q.get("kb") === "1") setKenBurns(true);
    if (q.get("grain") === "1") setFilmGrain(true);
    if (q.get("px") === "1") setParallax(true);
    if (q.get("autoplay") === "0") setAutoplay(false);
    const s = q.get("speed");
    if (s === "relaxed" || s === "steady" || s === "brisk") setSpeedId(s);
    const h = q.get("headline");
    if (h === "compact" || h === "classic" || h === "grand") setHeadlineSize(h);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    q.set("transition", transition);
    q.set("kb", kenBurns ? "1" : "0");
    q.set("grain", filmGrain ? "1" : "0");
    q.set("px", parallax ? "1" : "0");
    q.set("autoplay", autoplay ? "1" : "0");
    q.set("speed", speedId);
    q.set("headline", headlineSize);
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}`);
  }, [transition, kenBurns, filmGrain, parallax, autoplay, speedId, headlineSize]);

  const speed = SPEEDS.find((s) => s.id === speedId) ?? SPEEDS[1];

  return (
    <section className="relative isolate overflow-hidden bg-charcoal text-paper">
      <HeroSlider
        slides={slides}
        autoplay={autoplay}
        interval={speed.ms}
        transition={transition}
        kenBurns={kenBurns}
        filmGrain={filmGrain}
        parallax={parallax}
      />

      {/* Settings gear — typography + slider controls */}
      <div className="absolute right-4 top-20 z-20 md:right-8 md:top-24">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-label={settingsOpen ? "Close hero settings" : "Open hero settings"}
          aria-expanded={settingsOpen}
          className={`flex size-11 items-center justify-center rounded-full border shadow-[0_10px_28px_-10px_rgba(0,0,0,0.85)] backdrop-blur-sm transition-all active:scale-95 ${
            settingsOpen
              ? "border-brand-400/70 bg-brand-500/20 text-brand-300"
              : "border-paper/20 bg-black/45 text-paper/80 hover:border-brand-400/50 hover:text-paper"
          }`}
        >
          {settingsOpen ? <X className="size-5" /> : <Settings2 className="size-5" />}
        </button>

        <AnimatePresence>
          {settingsOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-14 max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-paper/15 bg-black/80 p-4 shadow-2xl shadow-black/60 backdrop-blur-md"
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-400">
                Typography
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-paper/5 p-1">
                {(["compact", "classic", "grand"] as HeadlineSize[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setHeadlineSize(s)}
                    className={`rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition-all ${
                      headlineSize === s
                        ? "bg-brand-500/25 text-brand-200"
                        : "text-paper/60 hover:text-paper"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-400">
                Image slider
              </p>
              <button
                type="button"
                onClick={() => setAutoplay((v) => !v)}
                aria-pressed={autoplay}
                className="mt-2 flex w-full items-center justify-between rounded-lg bg-paper/5 px-3 py-2 text-sm transition-colors hover:bg-paper/10"
              >
                <span className="font-medium text-paper/80">Autoplay</span>
                <span
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    autoplay ? "bg-brand-500" : "bg-paper/20"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                      autoplay ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-paper/5 p-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSpeedId(s.id);
                      setAutoplay(true);
                    }}
                    className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
                      speedId === s.id
                        ? "bg-brand-500/25 text-brand-200"
                        : "text-paper/60 hover:text-paper"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-400">
                Transition
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-paper/5 p-1">
                {TRANSITIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTransition(t.id)}
                    aria-pressed={transition === t.id}
                    className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
                      transition === t.id
                        ? "bg-brand-500/25 text-brand-200"
                        : "text-paper/60 hover:text-paper"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-400">
                Motion
              </p>
              <ToggleRow label="Ken Burns" value={kenBurns} onChange={setKenBurns} />
              <ToggleRow label="Film grain" value={filmGrain} onChange={setFilmGrain} />
              <ToggleRow label="Parallax" value={parallax} onChange={setParallax} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* 2026-09-29 Round 2: tighter top, roomier headline; aurora on "every DJ's crate" */}
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 md:pt-28">
        {/* Text-only eyebrow: motif mark + mono label, never a pill */}
        <p className="animate-rise flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
          <Motif className="h-4 w-4 text-brand-500" />
          For labels &amp; artists
        </p>
        <h1
          className={`animate-rise mt-6 max-w-5xl font-display leading-[1.02] tracking-tight [text-shadow:0_4px_44px_rgba(0,0,0,0.7)] ${HEADLINE_CLASS[headlineSize]}`}
          style={{ animationDelay: "90ms" }}
        >
          Your music, in{" "}
          <AuroraText colors={["#fcd34d", "#f59e0b", "#fb923c", "#f43f5e"]} speed={0.9}>
            every DJ&apos;s crate.
          </AuroraText>
        </h1>
        <p
          className="animate-rise mt-6 max-w-2xl text-lg leading-relaxed text-paper/70 [text-shadow:0_2px_20px_rgba(0,0,0,0.65)]"
          style={{ animationDelay: "180ms" }}
        >
          DJ Service Packs is the standard way to get promo material to the radio, club and digital
          DJs who break records. Submit one complete pack per release — every edit, the EPK, cover
          art — and verified DJs download it their way.
        </p>
        <div
          className="animate-rise mt-10 flex flex-wrap items-center gap-4"
          style={{ animationDelay: "270ms" }}
        >
          <Button size="lg" onClick={() => setOnboarding("artist")}>
            Get started as a label / artist
          </Button>
          <button
            type="button"
            onClick={() => setOnboarding("dj")}
            className="inline-flex h-12 touch-manipulation items-center justify-center rounded-md border border-paper/25 px-6 text-base font-semibold text-paper transition-all hover:bg-paper/10 active:scale-[0.98]"
          >
            DJ? Get verified — free
          </button>
        </div>
        <p
          className="animate-rise mt-6 text-sm text-paper/50"
          style={{ animationDelay: "340ms" }}
        >
          DJ onboarding is free. Artists &amp; labels start on a free tier and scale.
        </p>
        <div
          className="animate-rise mt-8 flex items-center gap-4"
          style={{ animationDelay: "400ms" }}
        >
          <PresenceFacepile users={djUsers} max={5} />
          <p className="text-sm text-paper/60">Made for DJs digging the crates</p>
        </div>

        {/* Stat strip — trust signals, count up on scroll into view */}
        <dl
          className="animate-rise mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-paper/15 pt-8 md:grid-cols-4"
          style={{ animationDelay: "420ms" }}
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dt className="order-2 mt-1 text-sm leading-snug text-paper/60">{s.label}</dt>
              <dd className="order-1 font-display text-4xl text-brand-400 [text-shadow:0_0_28px_rgba(240,168,33,0.35)] md:text-5xl">
                <CountUp to={s.to} />
              </dd>
            </div>
          ))}
        </dl>

        {/* 2026-09-28 21:35, sponsor credit */}
        <SponsorCredit tone="dark" className="mt-10 border-t border-paper/10 pt-6" />
      </div>
      <OnboardingModal open={onboarding} onClose={() => setOnboarding(null)} />
    </section>
  );
}
