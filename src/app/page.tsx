import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { HeroSection } from "@/components/HeroSection";
import { ParallaxBand } from "@/components/ParallaxBand";
import { Logo } from "@/components/Logo";
import { BackToTop } from "@/components/BackToTop";
import { Motif } from "@/components/Motif";
import { Reveal } from "@/components/Reveal";
import { ServicePackExplainer } from "@/components/ServicePackExplainer";
import { LatestReleases } from "@/components/LatestReleases";
import { WinguCredit } from "@/components/WinguCredit";
import { SponsorCredit } from "@/components/SponsorCredit";
import { Disc, Flame, Image as ImageIcon, Mic, Music2, Scissors, type LucideIcon } from "lucide-react";
import { AuroraText } from "@/components/godui/aurora-text";
import { BentoCard, BentoGrid } from "@/components/godui/bento-grid";
import { ScrollTimeline } from "@/components/godui/scroll-timeline";
import { Accordion } from "@/components/godui/accordion";
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

// 2026-09-29 Round 3: larger aurora-gradient icons for the pack-contents bento tiles.
// The gradient def is rendered once per section; each icon strokes through it.
function AuroraIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <Icon
      className="h-7 w-7 [filter:drop-shadow(0_0_6px_rgba(240,168,33,0.55))]"
      stroke="url(#djsp-aurora)"
      strokeWidth={1.8}
    />
  );
}

function AuroraDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="djsp-aurora" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5b83d" />
          <stop offset="55%" stopColor="#f0643c" />
          <stop offset="100%" stopColor="#e14e9a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      <SiteNav />

      {/* Hero — 2026-09-29 Round 4: image slider bg + settings (typography, slider) */}
      <HeroSection />

      {/* 2026-09-27 01:20, latest live releases (hidden when there are none) */}
      <div id="latest" className="scroll-mt-20">
        <LatestReleases />
      </div>

      {/* What's in a service pack — 2026-09-29 Round 2: dark amber/charcoal, no white */}
      <section id="standard" className="section-dark scroll-mt-20 text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          {/* 2026-09-29 Round 4: centered header, aurora on the closing line */}
          <Reveal className="text-center">
            <p className="flex items-center justify-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
              <Motif className="text-brand-500" />
              The standard
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-tight text-paper">
              One pack. Every edit.{" "}
              <AuroraText colors={["#fcd34d", "#f59e0b", "#fb923c", "#f43f5e"]} speed={0.9}>
                No more hunting files.
              </AuroraText>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-paper/65">
              Stop e-mailing 12 random attachments. A service pack is a single, organized release
              bundle that every DJ receives the same way — so there&apos;s never a missing acapella or
              a mislabeled intro when airtime matters.
            </p>
            <div className="mt-8 flex justify-center">
              <ServicePackExplainer />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <AuroraDefs />
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
                  icon={<AuroraIcon icon={t.icon} />}
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
          {/* 2026-09-29 Round 4: centered header, aurora on the closing line */}
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="flex items-center justify-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
              <Motif className="text-brand-500" />
              Made for the crate
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-tight text-paper">
              We built it for the DJs who{" "}
              <AuroraText colors={["#fcd34d", "#f59e0b", "#fb923c", "#f43f5e"]} speed={0.9}>
                break records.
              </AuroraText>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-paper/65">
              Radio programmers, club residents and stream DJs sign up for free, verify their station
              or venue once, and download packs in the format they actually use — WAV, AIFF or
              320kbps MP3.
            </p>
          </Reveal>
          <div className="mt-4">
            <div className="timeline-glow">
              <ScrollTimeline data={timelineData} />
            </div>
          </div>
        </div>
      </section>

      {/* Dig the crates — 2026-09-29 Round 2: GodUI filter-bar playground */}
      <section id="crates" className="section-dark scroll-mt-20 text-paper">
        <div className="mx-auto max-w-6xl px-6 py-20">
          {/* 2026-09-29 Round 4: centered header, aurora on the closing line */}
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="flex items-center justify-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
              <Motif className="text-brand-500" />
              Dig the crates
            </p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-tight text-paper">
              Take the crates{" "}
              <AuroraText colors={["#fcd34d", "#f59e0b", "#fb923c", "#f43f5e"]} speed={0.9}>
                for a spin.
              </AuroraText>
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
        {/* 2026-09-29 Round 4: parallax image band — vinyl crates, full-bleed */}
        <ParallaxBand
          src="/images/hero-slider/slider-crates.webp"
          eyebrow="From the crates"
          title="Deep crates, loud rooms."
          sub="Every pack starts with records like these — dug, cleaned, and cut for the club."
        />
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
              Asked{" "}
              <AuroraText colors={["#fcd34d", "#f59e0b", "#fb923c", "#f43f5e"]} speed={0.9}>
                all the time.
              </AuroraText>
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <Accordion type="single" defaultValue="what" items={faqItems} className="rounded-xl bg-paper/[0.02] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.9)]" />
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
                Get your next release into DJ hands,{" "}
                <AuroraText colors={["#fcd34d", "#f59e0b", "#fb923c", "#f43f5e"]} speed={0.9}>
                  the right way.
                </AuroraText>
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

      {/* 2026-09-29 Round 5: footer spread out — wider container, four columns,
          roomier padding, bottom bar split into two ends */}
      <footer className="border-t border-paper/10 bg-gradient-to-b from-[#0b0a08] via-[#050505] to-black text-paper">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.9fr_1fr_1fr_1fr] lg:gap-16">
            <div>
              <Logo tone="light" />
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/60">
                The standard way to get promo material to the radio, club and digital DJs who
                break records. One pack per release — every edit, every format, verified delivery.
              </p>
              <p className="mt-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-brand-400">
                <Motif className="text-brand-500" />
                In every crate
              </p>
            </div>
            <nav aria-label="Explore">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/40">
                Explore
              </p>
              <ul className="mt-5 space-y-3 text-sm font-medium">
                <li><Link href="#standard" className="text-paper/70 transition-colors hover:text-brand-400">The standard</Link></li>
                <li><Link href="#for-djs" className="text-paper/70 transition-colors hover:text-brand-400">For DJs</Link></li>
                <li><Link href="#faq" className="text-paper/70 transition-colors hover:text-brand-400">FAQ</Link></li>
              </ul>
            </nav>
            <nav aria-label="Library">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/40">
                Library
              </p>
              <ul className="mt-5 space-y-3 text-sm font-medium">
                <li><Link href="#latest" className="text-paper/70 transition-colors hover:text-brand-400">Latest releases</Link></li>
                <li><Link href="/releases" className="text-paper/70 transition-colors hover:text-brand-400">All releases</Link></li>
                <li><Link href="#crates" className="text-paper/70 transition-colors hover:text-brand-400">Dig the crates</Link></li>
              </ul>
            </nav>
            <nav aria-label="Get started">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/40">
                Get started
              </p>
              <ul className="mt-5 space-y-3 text-sm font-medium">
                <li><Link href="/onboarding/artist" className="text-paper/70 transition-colors hover:text-brand-400">Upload a service pack</Link></li>
                <li><Link href="/onboarding/dj" className="text-paper/70 transition-colors hover:text-brand-400">DJ verification</Link></li>
                <li><Link href="/login" className="text-paper/70 transition-colors hover:text-brand-400">Sign in</Link></li>
              </ul>
            </nav>
          </div>
          <div className="mt-14 flex flex-col items-center gap-4 border-t border-paper/10 pt-8 text-center md:flex-row md:justify-between md:text-left">
            <div className="flex flex-col items-center gap-2 md:items-start">
              {/* 2026-09-28 21:35, sponsor credit */}
              <SponsorCredit size="sm" tone="dark" />
              <p className="text-sm text-paper/50">© {new Date().getFullYear()} djservicepacks.com — the service pack for every release.</p>
            </div>
            {/* 2026-09-28 12:20, Wingu Digital credit — 2026-09-29 Round 6: pushed
                further down on mobile */}
            <div className="mt-6 shrink-0 md:mt-0">
              <WinguCredit tone="dark" />
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
