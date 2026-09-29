"use client";

import { useState } from "react";
import { FilterBar, type FilterValue } from "@/components/godui/filter-bar";
import { SpotlightCard } from "@/components/godui/spotlight-card";

type DemoPack = {
  name: string;
  genre: string;
  genreLabel: string;
  format: string;
  formatLabel: string;
  tracks: number;
};

const PACKS: DemoPack[] = [
  { name: "Midnight Frequency Vol. 12", genre: "house", genreLabel: "House", format: "wav", formatLabel: "WAV", tracks: 14 },
  { name: "Concrete Dreams", genre: "hip-hop", genreLabel: "Hip-Hop", format: "wav", formatLabel: "WAV", tracks: 16 },
  { name: "Calle Ritmo: Dembow Essentials", genre: "latin", genreLabel: "Latin", format: "mp3", formatLabel: "320 MP3", tracks: 18 },
  { name: "Velvet Hour", genre: "rnb", genreLabel: "R&B", format: "aiff", formatLabel: "AIFF", tracks: 11 },
  { name: "Sahara Groove", genre: "afrobeat", genreLabel: "Afrobeat", format: "mp3", formatLabel: "320 MP3", tracks: 12 },
  { name: "Perreo Clasicoz", genre: "reggaeton", genreLabel: "Reggaeton", format: "wav", formatLabel: "WAV", tracks: 15 },
  { name: "Neon Skyline", genre: "house", genreLabel: "House", format: "aiff", formatLabel: "AIFF", tracks: 13 },
  { name: "Boom Bap Archives", genre: "hip-hop", genreLabel: "Hip-Hop", format: "mp3", formatLabel: "320 MP3", tracks: 20 },
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <SpotlightCard
              key={p.name}
              className="p-5"
              glowColor="rgba(245,158,11,0.22)"
              radius={280}
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                {p.genreLabel}
              </p>
              <h3 className="mt-2 font-display text-lg leading-snug text-paper">{p.name}</h3>
              <p className="mt-3 text-sm text-paper/55">
                {p.tracks} tracks · {p.formatLabel}
              </p>
            </SpotlightCard>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-paper/15 px-6 py-10 text-center text-sm text-paper/50">
          Nothing on the shelf matches — clear a filter and keep digging.
        </p>
      )}
    </div>
  );
}
