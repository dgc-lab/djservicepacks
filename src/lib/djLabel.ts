import type { DjProfile } from "@/lib/types";

/**
 * Build the ready-to-render DJ credit line for a script, e.g.
 *   "DJ Surge · KABQ-FM"                (terrestrial radio)
 *   "DJ Surge @ mixcloud.com/djsurge"   (digital)
 *   "DJ Surge @ Club XYZ"               (club venue)
 * Falls back to just the DJ name if no station/venue is present.
 */
export function buildDjLabel(djName: string, profile: DjProfile | undefined): string {
  if (!profile) return djName;
  if (profile.platformType === "terrestrial_radio" && profile.stationCallLetters) {
    return `${djName} · ${profile.stationCallLetters}`;
  }
  if (profile.platformType !== "terrestrial_radio" && profile.venueOrUrl) {
    const src = profile.venueOrUrl.replace(/^https?:\/\/(www\.)?/i, "");
    return `${djName} @ ${src}`;
  }
  return djName;
}