"use client";

import { useState } from "react";
import { MagicTab } from "@/components/godui/magic-tab";

const FORMATS = [
  {
    value: "wav",
    label: "WAV",
    title: "WAV — the studio master",
    desc: "Uncompressed 44.1 kHz / 16-bit, exactly as the engineer bounced it. For radio playout systems and club rigs that want every last bit.",
    meta: "≈ 50 MB / track",
  },
  {
    value: "aiff",
    label: "AIFF",
    title: "AIFF — tagged for the booth",
    desc: "Same full uncompressed quality as WAV, with richer metadata — artwork and tags travel inside the file. The DJ software favorite.",
    meta: "≈ 50 MB / track",
  },
  {
    value: "mp3",
    label: "320 MP3",
    title: "320 MP3 — the workhorse",
    desc: "The highest-quality MP3 there is. Small enough to grab on venue Wi-Fi, clean enough for the booth. Nobody's asking 'got a link?' mid-set.",
    meta: "≈ 12 MB / track",
  },
] as const;

export function FormatTabs() {
  const [format, setFormat] = useState<string>("wav");
  const active = FORMATS.find((f) => f.value === format) ?? FORMATS[0];

  return (
    <div className="mt-5">
      <MagicTab
        items={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
        value={format}
        onValueChange={setFormat}
        size="md"
        aria-label="Pack formats"
      />
      <div className="mt-4 min-h-[8.5rem] rounded-lg border border-paper/10 bg-paper/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-paper">{active.title}</p>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-400">
            {active.meta}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-paper/60">{active.desc}</p>
      </div>
    </div>
  );
}
