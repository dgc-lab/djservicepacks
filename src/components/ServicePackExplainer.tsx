"use client";

import { useState } from "react";
import { ServicePackModal, ModalSection, ModalCheck } from "@/components/ServicePackModal";

const packContents = [
  "Clean / radio edit",
  "Dirty / explicit edit",
  "Instrumental",
  "Acapella (clean & dirty)",
  "Intro / outro edits (8 & 16 bar)",
  "High-res EPK + cover art",
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 items-center justify-center rounded-md border-2 border-brand-500 px-6 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-500/10"
      >
        What is a service pack?
      </button>

      <ServicePackModal open={open} onClose={() => setOpen(false)} title="What is a Service Pack?">
        <ModalSection title="One pack. Every edit. No more hunting files.">
          <p>
            A service pack is the single, standardized download bundle every DJ receives for a
            release. Instead of e-mailing a dozen random attachments, a label submits every edit of
            a song in one organized pack — so there&apos;s never a missing acapella or a mislabeled
            intro when airtime matters.
          </p>
        </ModalSection>

        <ModalSection title="Every pack includes">
          <ul className="space-y-2">
            {packContents.map((c) => (
              <ModalCheck key={c}>{c}</ModalCheck>
            ))}
          </ul>
        </ModalSection>

        <ModalSection title="How DJ drop scripts work">
          <ol className="list-decimal space-y-2 pl-5">
            {scriptSteps.map((s, i) => (
              <li key={i} className="text-sm text-ink">
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-ink-soft">
            Every recorded drop is credited to the DJ who wrote it — their name and station appear
            right on the audio — so your listeners always know who&apos;s behind the mic.
          </p>
        </ModalSection>
      </ServicePackModal>
    </>
  );
}