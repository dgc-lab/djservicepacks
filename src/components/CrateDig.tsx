"use client";

import { useState } from "react";
import { FilterBar, type FilterValue } from "@/components/godui/filter-bar";
import { SpotlightCard } from "@/components/godui/spotlight-card";
import { Waveform } from "@/components/Waveform";

type DemoPack = {
  name: string;
  genre: string;
  genreLabel: string;
  format: string;
  formatLabel: string;
  tracks: number;
  art: string;
};

// Round 8 — every pack gets its own generated cover art (/public/packs).
const PACKS: DemoPack[] = [
  { name: "Midnight Frequency Vol. 12", genre: "house", genreLabel: "House", format: "wav", formatLabel: "WAV", tracks: 14, art: "midnight-frequency.jpg" },
  { name: "Concrete Dreams", genre: "hip-hop", genreLabel: "Hip-Hop", format: "wav", formatLabel: "WAV", tracks: 16, art: "concrete-dreams.jpg" },
  { name: "Calle Ritmo: Dembow Essentials", genre: "latin", genreLabel: "Latin", format: "mp3", formatLabel: "320 MP3", tracks: 18, art: "calle-ritmo.jpg" },
  { name: "Velvet Hour", genre: "rnb", genreLabel: "R&B", format: "aiff", formatLabel: "AIFF", tracks: 11, art: "velvet-hour.jpg" },
  { name: "Sahara Groove", genre: "afrobeat", genreLabel: "Afrobeat", format: "mp3", formatLabel: "320 MP3", tracks: 12, art: "sahara-groove.jpg" },
  { name: "Perreo Clasicoz", genre: "reggaeton", genreLabel: "Reggaeton", format: "wav", formatLabel: "WAV", tracks: 15, art: "perreo-clasicoz.jpg" },
  { name: "Neon Skyline", genre: "house", genreLabel: "House", format: "aiff", formatLabel: "AIFF", tracks: 13, art: "neon-skyline.jpg" },
  { name: "Boom Bap Archives", genre: "hip-hop", genreLabel: "Hip-Hop", format: "mp3", formatLabel: "320 MP3", tracks: 20, art: "boom-bap-archives.jpg" },
];

const FACETS = [
  {
    id: "genre",
    label: "Genre",
    options: [
      { label: "Hip-Hop", value: "hip-hop", count: 2 },
      { label: "House", value: "house", count: 2 },
      { label: "Latin", value: "latin", count: 1 },
      { label: "R&B", value: "rnb", count: 1 },
      { label: "Afrobeat", value: "afrobeat", count: 1 },
      { label: "Reggaeton", value: "reggaeton", count: 1 },
    ],
  },
  {
    id: "format",
    label: "Format",
    options: [
      { label: "WAV", value: "wav", count: 3 },
      { label: "AIFF", value: "aiff", count: 2 },
      { label: "320 MP3", value: "mp3", count: 3 },
    ],
  },
];

export function CrateDig() {
  const [value, setValue] = useState<FilterValue>({});
  // Name of the pack currently "previewing" — its waveform dances.
  const [playing, setPlaying] = useState<string | null>(null);
  const genres = value.genre ?? [];
  const formats = value.format ?? [];
  const filtered = PACKS.filter(
    (p) =>
      (genres.length === 0 || genres.includes(p.genre)) &&
      (formats.length === 0 || formats.includes(p.format)),
  );

  return (
    <div>
      <FilterBar facets={FACETS} value={value} onChange={setValue} aria-label="Filter demo packs" />
      <p className="mb-4 mt-5 text-sm text-paper/50">
        {filtered.length} of {PACKS.length} packs on the demo shelf
      </p>
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => {
            const isPlaying = playing === p.name;
            return (
              <SpotlightCard
                key={p.name}
                className="group overflow-hidden p-0"
                glowColor="rgba(245,158,11,0.25)"
                radius={280}
              >
                <button
                  type="button"
                  onClick={() => setPlaying(isPlaying ? null : p.name)}
                  aria-pressed={isPlaying}
                  aria-label={`${isPlaying ? "Stop" : "Preview"} ${p.name}`}
                  className="block w-full text-left"
                >
                  {/* Cover art */}
                  <div className="relative aspect-square overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/packs/${p.art}`}
                      alt={`${p.name} cover art`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"
                    />
                    {/* Playing pulse */}
                    <span
                      aria-hidden
                      className={`absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/55 text-brand-300 backdrop-blur transition-opacity ${
                        isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <span className="flex items-end gap-[2.5px]">
                        <span
                          className={`w-[3px] rounded-full bg-current ${isPlaying ? "animate-pulse" : ""}`}
                          style={{ height: 14 }}
                        />
                        <span
                          className={`w-[3px] rounded-full bg-current ${isPlaying ? "animate-pulse" : ""}`}
                          style={{ height: 9, animationDelay: "0.15s" }}
                        />
                        <span
                          className={`w-[3px] rounded-full bg-current ${isPlaying ? "animate-pulse" : ""}`}
                          style={{ height: 12, animationDelay: "0.3s" }}
                        />
                      </span>
                    </span>
                  </div>
                  {/* Meta + waveform */}
                  <div className="p-5">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                      {p.genreLabel}
                    </p>
                    <h3 className="mt-2 font-display text-lg leading-snug text-paper">
                      {p.name}
                    </h3>
                    <Waveform
                      seed={p.name}
                      playing={isPlaying}
                      className="mt-4 h-10"
                    />
                    <p className="mt-3 text-sm text-paper/55">
                      {p.tracks} tracks · {p.formatLabel}
                      <span className="text-paper/35">
                        {" "}
                        · {isPlaying ? "previewing" : "tap to preview"}
                      </span>
                    </p>
                  </div>
                </button>
              </SpotlightCard>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-paper/15 px-6 py-10 text-center text-sm text-paper/50">
          Nothing on the shelf matches — clear a filter and keep digging.
        </p>
      )}
    </div>
  );
}
