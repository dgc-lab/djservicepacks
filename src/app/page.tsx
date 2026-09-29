import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { Motif } from "@/components/Motif";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { ServicePackExplainer } from "@/components/ServicePackExplainer";
import { LatestReleases } from "@/components/LatestReleases";
import { WinguCredit } from "@/components/WinguCredit";
import { SponsorCredit } from "@/components/SponsorCredit";

// 2026-09-27 01:20, ISR for the Latest releases grid (also revalidated on publish)
export const revalidate = 300;

const packContents = [
  "Clean / radio edit",
  "Dirty / explicit edit",
  "Instrumental",
  "Acapella (clean & dirty)",
  "Intro / outro edits (8 & 16 bar)",
  "High-res EPK + cover art",
];

const steps = [
  {
    n: "01",
    t: "Build the pack",
    d: "Upload every edit of your release — wet/dry, clean/dirty, intros, acapellas — in WAV, AIFF or 320kbps MP3.",
  },
  {
    n: "02",
    t: "Labels submit, we standardize",
    d: "We organize it into one standard service pack format and host it on Backblaze B2. Consistent for every DJ.",
  },
  {
    n: "03",
    t: "DJs get it in their hands",
    d: "Verified radio, club and digital DJs download the full pack, log their spins, and feed you real play data.",
  },
];

const stats = [
  { to: 6, label: "edits in every pack" },
  { to: 3, label: "formats — WAV · AIFF · 320 MP3" },
  { to: 2, label: "sides of the crate: labels & DJs" },
  { to: 1, label: "standard pack format" },
];

export default function Home() {
  return (
    <main className="flex-1">
      <SiteNav />

      {/* Hero — label/artist-first */}
      {/* 2026-09-28 15:25, studio photo as hero background (darkened left for text contrast) */}
      <section className="relative isolate overflow-hidden bg-charcoal text-paper">
        <Image
          src="/images/studio.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          className="-z-10 object-cover object-[70%_30%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-charcoal via-charcoal/85 to-charcoal/40"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-charcoal to-transparent" />

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-36 md:pt-40">
          {/* Text-only eyebrow: motif mark + mono label, never a pill */}
          <p className="animate-rise flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
            <Motif className="h-4 w-4 text-brand-500" />
            For labels &amp; artists
          </p>
          <h1
            className="animate-rise mt-6 max-w-4xl font-display text-[clamp(2.9rem,7vw,4.6rem)] leading-[0.95] tracking-tight"
            style={{ animationDelay: "90ms" }}
          >
            Your music, in every DJ&apos;s crate.
          </h1>
          <p
            className="animate-rise mt-6 max-w-2xl text-lg leading-relaxed text-paper/70"
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
            <Button size="lg">
              <Link href="/onboarding/artist">Get started as a label / artist</Link>
            </Button>
            <Link
              href="/onboarding/dj"
              className="inline-flex h-12 items-center justify-center rounded-md border border-paper/25 px-6 text-base font-semibold text-paper transition-all hover:bg-paper/10 active:scale-[0.98]"
            >
              DJ? Get verified — free
            </Link>
          </div>
          <p
            className="animate-rise mt-6 text-sm text-paper/50"
            style={{ animationDelay: "340ms" }}
          >
            DJ onboarding is free. Artists &amp; labels start on a free tier and scale.
          </p>

          {/* Stat strip — trust signals, count up on scroll into view */}
          <dl
            className="animate-rise mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-paper/15 pt-8 md:grid-cols-4"
            style={{ animationDelay: "420ms" }}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col">
                <dt className="order-2 mt-1 text-sm leading-snug text-paper/60">{s.label}</dt>
                <dd className="order-1 font-display text-4xl text-brand-400 md:text-5xl">
                  <CountUp to={s.to} />
                </dd>
              </div>
            ))}
          </dl>

          {/* 2026-09-28 21:35, sponsor credit */}
          <SponsorCredit tone="dark" className="mt-10 border-t border-paper/10 pt-6" />
        </div>
      </section>

      {/* 2026-09-27 01:20, latest live releases (hidden when there are none) */}
      <div id="latest" className="scroll-mt-20">
        <LatestReleases />
      </div>

      {/* What's in a service pack */}
      <section id="standard" className="scroll-mt-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">
              <Motif className="text-brand-500" />
              The standard
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-tight text-ink">
              One pack. Every edit. No more hunting files.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              Stop e-mailing 12 random attachments. A service pack is a single, organized release
              bundle that every DJ receives the same way — so there&apos;s never a missing acapella or
              a mislabeled intro when airtime matters.
            </p>
            <div className="mt-8">
              <ServicePackExplainer />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {packContents.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-3 rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm font-medium text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-[0_16px_32px_-20px_rgba(15,14,11,0.35)]"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-black text-charcoal">
                    ✓
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Built for the DJs */}
      <section id="for-djs" className="scroll-mt-20 border-y border-ink/10 bg-paper-dark">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="max-w-2xl">
            <p className="flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">
              <Motif className="text-brand-500" />
              Made for the crate
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-tight text-ink">
              We built it for the DJs who break records.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              Radio programmers, club residents and stream DJs sign up for free, verify their station
              or venue once, and download packs in the format they actually use — WAV, AIFF or
              320kbps MP3.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 110}>
                <div className="h-full rounded-xl border border-ink/10 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(15,14,11,0.35)]">
                  <div className="font-display text-4xl text-brand-500">{s.n}</div>
                  <h3 className="mt-3 text-lg font-bold text-ink">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-charcoal text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <Reveal>
            <p className="flex items-center justify-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
              <Motif className="text-brand-500" />
              In every crate
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.02] tracking-tight">
              Get your next release into DJ hands, the right way.
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg">
                <Link href="/onboarding/artist">Upload a service pack</Link>
              </Button>
              <Link
                href="/onboarding/dj"
                className="inline-flex h-12 items-center justify-center rounded-md border border-paper/25 px-6 text-base font-semibold text-paper transition-all hover:bg-paper/10 active:scale-[0.98]"
              >
                I&apos;m a DJ
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-ink/10 bg-paper-dark py-8 text-center text-sm text-ink-soft">
        {/* 2026-09-28 21:35, sponsor credit */}
        <SponsorCredit size="sm" className="mb-4" />
        <p className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft/60">
          <Motif className="text-brand-500" />
          In every crate
        </p>
        <p className="mt-3">© {new Date().getFullYear()} djservicepacks.com — the service pack for every release.</p>
        {/* 2026-09-28 12:20, Wingu Digital credit */}
        <WinguCredit className="mt-3" />
      </footer>
    </main>
  );
}
