"use client";

import { useState } from "react";
import { Disc, Flame, Music2, Mic, Scissors, Image as ImageIcon } from "lucide-react";
import { ServicePackModal, ModalSection } from "@/components/ServicePackModal";
import { AuroraText } from "@/components/godui/aurora-text";
import { Reveal } from "@/components/Reveal";
import { Motif } from "@/components/Motif";

/**
 * 2026-09-29 Round 7 — no longer a button + popup. "What is a service pack?"
 * is the main event now: a full-bleed showcase band with the definition and
 * the six pack contents as glowing cards. The bottom-sheet modal survives for
 * the deeper "How DJ drop scripts work" dive.
 */
const packContents = [
  { icon: Disc, title: "Clean / radio edit", desc: "FCC-ready, no bleeps needed." },
  { icon: Flame, title: "Dirty / explicit edit", desc: "The record as the artist intended." },
  { icon: Music2, title: "Instrumental", desc: "For freestyles, beds and remixes." },
  { icon: Mic, title: "Acapella", desc: "Clean & dirty vocals, mix-ready." },
  { icon: Scissors, title: "Intro / outro edits", desc: "8 & 16 bar, built for the blend." },
  { icon: ImageIcon, title: "EPK + cover art", desc: "High-res art and one-sheet attached." },
];

const scriptSteps = [
  "A DJ writes their on-air liners — e.g. \u201cYou\u2019re locked into DJ Surge on KABQ-FM\u2026\u201d — and saves them to their profile.",
  "A label or artist sees that script when uploading their service pack and can record a voiced version of it.",
  "That recorded drop is added to the release, labeled with the DJ\u2019s name and station, ready for the DJ to play in their broadcast.",
];

export function ServicePackExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative left-1/2 mt-16 w-screen -translate-x-1/2 overflow-hidden">
        {/* aurora hairlines */}
        <div
          aria-hidden="true"
          className="h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent"
        />
        <div className="relative bg-[#0a0908] px-6 py-16 md:py-24">
          {/* glow wash */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(640px 320px at 50% 0%, rgba(245,158,11,0.14), transparent 70%), radial-gradient(520px 300px at 12% 100%, rgba(244,63,94,0.10), transparent 70%), radial-gradient(520px 300px at 88% 100%, rgba(245,158,11,0.10), transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl text-center">
            <Reveal>
              <p className="flex items-center justify-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
                <Motif className="text-brand-500" />
                What&apos;s inside
              </p>
              <h2 className="mx-auto mt-4 max-w-3xl font-display text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.02] tracking-tight text-paper">
                What is a{" "}
                <AuroraText
                  colors={["#fcd34d", "#f59e0b", "#fb923c", "#f43f5e"]}
                  speed={0.9}
                >
                  service pack?
                </AuroraText>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-paper/65 md:text-lg">
                A service pack is the single, standardized download bundle every DJ
                receives for a release. Instead of e-mailing a dozen random attachments,
                a label submits every edit of a song in one organized pack — so
                there&apos;s never a missing acapella or a mislabeled intro when
                airtime matters.
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-3">
              {packContents.map((c, i) => (
                <Reveal key={c.title} delay={i * 70}>
                  <div className="group h-full rounded-2xl border border-paper/10 bg-paper/[0.045] p-5 text-left shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/60 hover:shadow-[0_0_45px_rgba(245,158,11,0.28)] md:p-6">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-shadow duration-300 group-hover:shadow-[0_0_32px_rgba(245,158,11,0.65)]">
                      <c.icon className="h-5 w-5" strokeWidth={1.9} />
                    </div>
                    <p className="mt-4 text-sm font-bold text-paper md:text-base">
                      {c.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-paper/55 md:text-sm">
                      {c.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={160}>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-10 inline-flex h-12 items-center justify-center rounded-md border-2 border-brand-500 px-6 text-base font-semibold text-brand-400 shadow-[0_0_24px_rgba(245,158,11,0.25)] transition-all hover:bg-brand-500/10 hover:shadow-[0_0_36px_rgba(245,158,11,0.45)]"
              >
                How DJ drop scripts work
              </button>
            </Reveal>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="h-px bg-gradient-to-r from-transparent via-[#f43f5e] to-transparent"
        />
      </div>

      <ServicePackModal
        open={open}
        onClose={() => setOpen(false)}
        title="How DJ drop scripts work"
      >
        <ModalSection title="Your voice, on their record.">
          <ol className="list-decimal space-y-2 pl-5">
            {scriptSteps.map((s, i) => (
              <li key={i} className="text-sm text-paper/80">
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-paper/55">
            Every recorded drop is credited to the DJ who wrote it — their name and
            station appear right on the audio — so your listeners always know
            who&apos;s behind the mic.
          </p>
        </ModalSection>
      </ServicePackModal>
    </>
  );
}
