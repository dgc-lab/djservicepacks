import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { Logo } from "@/components/Logo";
import { BackToTop } from "@/components/BackToTop";
import { Motif } from "@/components/Motif";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { ServicePackExplainer } from "@/components/ServicePackExplainer";
import { LatestReleases } from "@/components/LatestReleases";
import { WinguCredit } from "@/components/WinguCredit";
import { SponsorCredit } from "@/components/SponsorCredit";
import { Disc, Flame, Image as ImageIcon, Mic, Music2, Scissors } from "lucide-react";
import { AuroraText } from "@/components/godui/aurora-text";
import { BentoCard, BentoGrid } from "@/components/godui/bento-grid";
import { ScrollTimeline } from "@/components/godui/scroll-timeline";
import { Accordion } from "@/components/godui/accordion";
import { PresenceFacepile, type PresenceUser } from "@/components/godui/presence/presence-facepile";
import { LiquidGlassCard } from "@/components/godui/liquid-glass-card";
import { GradientBackground } from "@/components/godui/gradient-background";
import { FormatTabs } from "@/components/FormatTabs";
import { CrateDig } from "@/components/CrateDig";
import { CtaActions } from "@/components/CtaActions";

// 2026-09-27 01:20, ISR for the Latest releases grid (also revalidated on publish)
export const revalidate = 300;

const packTiles = [
  { icon: Disc, title: "Clean / radio edit", desc: "FCC-ready, no bleeps needed." },
  { icon: Flame, title: "Dirty / explicit edit", desc: "The record as the artist intended." },
  { icon: Music2, title: "Instrumental", desc: "For freestyles, beds and remixes." },
  { icon: Mic, title: "Acapella", desc: "Clean & dirty vocals, mix-ready." },
  { icon: Scissors, title: "Intro / outro edits", desc: "8 & 16 bar, built for the blend." },
  { icon: ImageIcon, title: "EPK + cover art", desc: "High-res art and one-sheet attached." },
];

const timelineData = [
  {
    date: "01",
    title: "Build the pack",
    content:
      "Upload every edit of your release — clean/dirty, wet/dry, intros, acapellas — in WAV, AIFF or 320kbps MP3.",
  },
  {
    date: "02",
    title: "Labels submit, we standardize",
    content:
      "We organize it into one standard service pack format and host it on Backblaze B2. Consistent for every DJ.",
  },
  {
    date: "03",
    title: "DJs get it in their hands",
    content:
      "Verified radio, club and digital DJs download the full pack, log their spins, and feed you real play data.",
  },
  {
    date: "04",
    title: "Spins come back as data",
    content:
      "Every download and logged spin lands in your dashboard — see which DJs and stations are breaking your record.",
  },
];

const faqItems = [
  {
    value: "what",
    title: "What exactly is a service pack?",
    content:
      "One organized bundle per release: every edit (clean, dirty, instrumental, acapella, intros/outros), the EPK and cover art — in WAV, AIFF and 320kbps MP3. DJs download the whole thing at once instead of chasing attachments.",
  },
  {
    value: "formats",
    title: "What formats do DJs get?",
    content:
      "WAV and AIFF for full uncompressed quality, plus 320kbps MP3 for fast grabs on venue Wi-Fi. Every pack ships all three — the DJ picks what works in their setup.",
  },
  {
    value: "free",
    title: "Is it really free for DJs?",
    content:
      "Yes. Radio, club and digital DJs verify their station or venue once and download packs free, forever. Artists and labels start on a free tier and scale with releases.",
  },
  {
    value: "submit",
    title: "How do labels submit a release?",
    content:
      "Upload your edits once per release through the artist onboarding. We standardize the pack, host it, and push it to verified DJs — no more emailing zip files.",
  },
  {
    value: "verified",
    title: "What does “verified DJ” mean?",
    content:
      "We confirm the DJ is really behind the decks — a station, a club residency, or an established digital presence. Labels know their music is going to working DJs, not download collectors.",
  },
];

const djUsers: PresenceUser[] = [
  { id: "mira", name: "DJ Mira", status: "active" },
  { id: "kwest", name: "DJ Kwest", status: "active" },
  { id: "luna", name: "DJ Luna", status: "typing" },
  { id: "paco", name: "DJ Paco", status: "idle" },
  { id: "sable", name: "DJ Sable", status: "active" },
  { id: "rex", name: "DJ Rex", status: "active" },
  { id: "nia", name: "DJ Nia", status: "offline" },
  { id: "ozo", name: "DJ Ozo", status: "active" },
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

        {/* 2026-09-29 Round 2: tighter top, roomier headline; aurora on "every DJ's crate" */}
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 md:pt-28">
          {/* Text-only eyebrow: motif mark + mono label, never a pill */}
          <p className="animate-rise flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
            <Motif className="h-4 w-4 text-brand-500" />
            For labels &amp; artists
          </p>
          <h1
            className="animate-rise mt-6 max-w-5xl font-display text-[clamp(3.2rem,8.5vw,5.5rem)] leading-[1.02] tracking-tight"
            style={{ animationDelay: "90ms" }}
          >
            Your music, in{" "}
            <AuroraText colors={["#fcd34d", "#f59e0b", "#fb923c", "#f43f5e"]} speed={0.9}>
              every DJ&apos;s crate.
            </AuroraText>
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

      {/* What's in a service pack — 2026-09-29 Round 2: dark amber/charcoal, no white */}
      <section id="standard" className="section-dark scroll-mt-20 text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
              <Motif className="text-brand-500" />
              The standard
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-tight text-paper">
              One pack. Every edit. No more hunting files.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-paper/65">
              Stop e-mailing 12 random attachments. A service pack is a single, organized release
              bundle that every DJ receives the same way — so there&apos;s never a missing acapella or
              a mislabeled intro when airtime matters.
            </p>
            <div className="mt-8">
              <ServicePackExplainer />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <BentoGrid columns={2}>
              <BentoCard
                colSpan={2}
                title="One pack. Three formats."
                description="Every edit ships in the format each DJ actually uses. Pick a format:"
              >
                <FormatTabs />
              </BentoCard>
              {packTiles.map((t) => (
                <BentoCard
                  key={t.title}
                  icon={<t.icon className="h-5 w-5" />}
                  title={t.title}
                  description={t.desc}
                />
              ))}
            </BentoGrid>
          </Reveal>
        </div>
      </section>

      {/* How it works — 2026-09-29 Round 2: dark amber/charcoal; timeline component lands here */}
      <section id="for-djs" className="section-dark scroll-mt-20 border-y border-paper/10 text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="max-w-2xl">
            <p className="flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
              <Motif className="text-brand-500" />
              Made for the crate
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-tight text-paper">
              We built it for the DJs who break records.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-paper/65">
              Radio programmers, club residents and stream DJs sign up for free, verify their station
              or venue once, and download packs in the format they actually use — WAV, AIFF or
              320kbps MP3.
            </p>
          </Reveal>
          <div className="mt-4">
            <ScrollTimeline data={timelineData} />
          </div>
        </div>
      </section>

      {/* Dig the crates — 2026-09-29 Round 2: GodUI filter-bar playground */}
      <section id="crates" className="section-dark scroll-mt-20 text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="max-w-2xl">
            <p className="flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
              <Motif className="text-brand-500" />
              Dig the crates
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-tight text-paper">
              Take the crates for a spin.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-paper/65">
              A taste of the DJ side — filter the demo shelf by genre and format. This is the same
              filter DJs use to find your pack.
            </p>
          </Reveal>
          <div className="mt-10">
            <CrateDig />
          </div>
        </div>
      </section>

      {/* FAQ — 2026-09-29 Round 2: GodUI accordion */}
      <section id="faq" className="section-dark scroll-mt-20 border-t border-paper/10 text-paper">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <Reveal className="text-center">
            <p className="flex items-center justify-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
              <Motif className="text-brand-500" />
              Questions
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-tight text-paper">
              Asked all the time.
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <Accordion type="single" defaultValue="what" items={faqItems} className="bg-paper/[0.02]" />
          </Reveal>
        </div>
      </section>

      {/* Final CTA — 2026-09-29 Round 2: liquid glass + gradient + multi-button */}
      <section className="relative overflow-hidden bg-charcoal text-paper">
        <GradientBackground
          style={{
            backgroundImage:
              "radial-gradient(circle 600px at 50% 0px, rgba(245,158,11,0.16), transparent), radial-gradient(circle 420px at 85% 100%, rgba(244,63,94,0.08), transparent)",
            backgroundColor: "#0e0c09",
          }}
        />
        <div className="relative z-raised mx-auto max-w-6xl px-6 py-24">
          <Reveal className="mx-auto max-w-3xl">
            <LiquidGlassCard className="p-8 text-center md:p-12" tint="rgba(20,16,10,0.55)">
              <p className="flex items-center justify-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
                <Motif className="text-brand-500" />
                In every crate
              </p>
              <h2 className="mx-auto mt-4 max-w-2xl font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.02] tracking-tight text-paper">
                Get your next release into DJ hands, the right way.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-paper/65">
                One upload, every edit, every format — in front of the verified DJs who break
                records.
              </p>
              <div className="mt-8 flex justify-center">
                <CtaActions />
              </div>
              <p className="mt-6 text-sm text-paper/50">
                DJ onboarding is free. Artists &amp; labels start on a free tier and scale.
              </p>
            </LiquidGlassCard>
          </Reveal>
        </div>
      </section>

      <BackToTop />

      {/* 2026-09-29 Round 2: reimagined footer — link columns, brand block, credits */}
      <footer className="border-t border-paper/10 bg-charcoal text-paper">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Logo tone="light" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/60">
                The standard way to get promo material to the radio, club and digital DJs who
                break records.
              </p>
              <p className="mt-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-brand-400">
                <Motif className="text-brand-500" />
                In every crate
              </p>
            </div>
            <nav aria-label="Explore">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/40">
                Explore
              </p>
              <ul className="mt-4 space-y-2.5 text-sm font-medium">
                <li><Link href="#standard" className="text-paper/70 transition-colors hover:text-brand-400">The standard</Link></li>
                <li><Link href="#for-djs" className="text-paper/70 transition-colors hover:text-brand-400">For DJs</Link></li>
                <li><Link href="#latest" className="text-paper/70 transition-colors hover:text-brand-400">Latest releases</Link></li>
                <li><Link href="#crates" className="text-paper/70 transition-colors hover:text-brand-400">Dig the crates</Link></li>
                <li><Link href="#faq" className="text-paper/70 transition-colors hover:text-brand-400">FAQ</Link></li>
              </ul>
            </nav>
            <nav aria-label="Get started">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/40">
                Get started
              </p>
              <ul className="mt-4 space-y-2.5 text-sm font-medium">
                <li><Link href="/onboarding/artist" className="text-paper/70 transition-colors hover:text-brand-400">Upload a service pack</Link></li>
                <li><Link href="/onboarding/dj" className="text-paper/70 transition-colors hover:text-brand-400">DJ verification</Link></li>
                <li><Link href="/login" className="text-paper/70 transition-colors hover:text-brand-400">Sign in</Link></li>
              </ul>
            </nav>
          </div>
          <div className="mt-12 flex flex-col items-center gap-3 border-t border-paper/10 pt-6 text-center">
            {/* 2026-09-28 21:35, sponsor credit */}
            <SponsorCredit size="sm" tone="dark" />
            <p className="text-sm text-paper/50">© {new Date().getFullYear()} djservicepacks.com — the service pack for every release.</p>
            {/* 2026-09-28 12:20, Wingu Digital credit */}
            <WinguCredit className="mt-1" tone="dark" />
          </div>
        </div>
      </footer>
    </main>
  );
}
