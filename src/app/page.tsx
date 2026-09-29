import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
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

export default function Home() {
  return (
    <main className="flex-1">
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
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo tone="light" />
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/login" className="text-paper/70 hover:text-paper">
              Sign in
            </Link>
            <Button variant="primary">
              <Link href="/onboarding/artist">Upload a service pack</Link>
            </Button>
          </nav>
        </header>

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-20">
          <p className="inline-block border border-brand-400/40 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            For labels &amp; artists
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">
            Your music, in every DJ&apos;s crate.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-paper/70">
            DJ Service Packs is the standard way to get promo material to the radio, club and digital
            DJs who break records. Submit one complete pack per release — every edit, the EPK, cover
            art — and verified DJs download it their way.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button size="lg">
              <Link href="/onboarding/artist">Get started as a label / artist</Link>
            </Button>
            <Link
              href="/onboarding/dj"
              className="inline-flex h-12 items-center justify-center rounded-md border border-paper/25 px-6 text-base font-semibold text-paper transition-colors hover:bg-paper/10"
            >
              DJ? Get verified — free
            </Link>
          </div>
          <p className="mt-6 text-sm text-paper/50">
            DJ onboarding is free. Artists &amp; labels start on a free tier and scale.
          </p>
          {/* 2026-09-28 21:35, sponsor credit */}
          <SponsorCredit tone="dark" className="mt-10 border-t border-paper/10 pt-6" />
        </div>
      </section>

      {/* 2026-09-27 01:20, latest live releases (hidden when there are none) */}
      <LatestReleases />

      {/* What's in a service pack */}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">The standard</p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-ink">
            One pack. Every edit. No more hunting files.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            Stop e-mailing 12 random attachments. A service pack is a single, organized release
            bundle that every DJ receives the same way — so there&apos;s never a missing acapella or
            a mislabeled intro when airtime matters.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {packContents.map((c) => (
            <li
              key={c}
              className="flex items-center gap-3 rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm font-medium text-ink"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-black text-charcoal">
                ✓
              </span>
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <ServicePackExplainer />
        </div>
      </section>

      {/* Build for the DJs */}
      <section className="border-y border-ink/10 bg-paper-dark">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">
              Made for the crate
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight text-ink">
              We built it for the DJs who break records.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              Radio programmers, club residents and stream DJs sign up for free, verify their station
              or venue once, and download packs in the format they actually use — WAV, AIFF or
              320kbps MP3.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-xl border border-ink/10 bg-white p-6">
                <div className="text-4xl font-black text-brand-500">{s.n}</div>
                <h3 className="mt-3 text-lg font-bold text-ink">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-charcoal text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="mx-auto max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
            Get your next release into DJ hands, the right way.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg">
              <Link href="/onboarding/artist">Upload a service pack</Link>
            </Button>
            <Link
              href="/onboarding/dj"
              className="inline-flex h-12 items-center justify-center rounded-md border border-paper/25 px-6 text-base font-semibold text-paper transition-colors hover:bg-paper/10"
            >
              I&apos;m a DJ
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/10 bg-paper-dark py-8 text-center text-sm text-ink-soft">
        {/* 2026-09-28 21:35, sponsor credit */}
        <SponsorCredit size="sm" className="mb-4" />
        <p>© {new Date().getFullYear()} djservicepacks.com — the service pack for every release.</p>
        {/* 2026-09-28 12:20, Wingu Digital credit */}
        <WinguCredit className="mt-3" />
      </footer>
    </main>
  );
}