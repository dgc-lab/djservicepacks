"use client";

import * as React from "react";

// Round 8 — interactive waveform strip for the demo-shelf pack cards.
// Bars are seeded from the pack name so every pack has its own stable shape.
// The dance animation is paused until the card is hovered or the pack is
// "playing" (toggled by clicking the card); reduced-motion users see a
// static waveform.

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type WaveformProps = {
  /** Stable seed — pass the pack name so each pack keeps its own shape. */
  seed: string;
  /** When true the bars dance even without hover (the "previewing" state). */
  playing?: boolean;
  className?: string;
};

const BAR_COUNT = 56;

export function Waveform({ seed, playing = false, className }: WaveformProps) {
  const bars = React.useMemo(() => {
    const rand = mulberry32(hashSeed(seed));
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      // Smooth-ish waveform: mix a couple of sines with noise so it reads
      // like audio, not random static.
      const wave =
        0.55 +
        0.28 * Math.sin(i * 0.42 + rand() * 6.28) +
        0.17 * Math.sin(i * 1.31 + rand() * 6.28);
      const height = Math.min(1, Math.max(0.12, wave * (0.55 + rand() * 0.65)));
      return {
        height: Math.round(height * 100),
        delay: -(rand() * 1.4),
        duration: 0.9 + rand() * 0.7,
      };
    });
  }, [seed]);

  return (
    <div
      aria-hidden
      className={`flex items-center gap-[3px] ${playing ? "waveform-playing" : ""} ${className ?? ""}`}
    >
      {bars.map((b, i) => (
        <span
          key={i}
          className="waveform-bar w-full rounded-full bg-[linear-gradient(to_top,#f59e0b,#fb923c_55%,#f43f5e)]"
          style={{
            height: `${b.height}%`,
            animationDelay: `${b.delay.toFixed(2)}s`,
            animationDuration: `${b.duration.toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}
