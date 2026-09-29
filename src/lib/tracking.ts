// 2026-09-28 13:00, play/download tracking.
// Every event goes to the `events` log (who/what/when). Non-admin events also bump running
// totals on the release doc (stats.plays / stats.downloads / stats.byTrack.<id>.*) so top
// charts don't need to scan the log. Admin activity is logged but never counted.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { SessionUser } from "@/lib/session";
import type { TrackType } from "@/lib/types";

export type EventType = "play" | "download";

export interface TrackEvent {
  type: EventType;
  releaseId: string;
  trackId: string;
  trackType: TrackType | null;
  uid: string;
  role: string | null;
  at: string;
}

/** Record one play/download. Never throws — tracking must not break playback or downloads. */
export async function recordEvent(
  user: SessionUser,
  type: EventType,
  releaseId: string,
  trackId: string,
  trackType: TrackType | null
): Promise<void> {
  try {
    const db = getAdminDb();
    const event: TrackEvent = { type, releaseId, trackId, trackType, uid: user.uid, role: user.role, at: new Date().toISOString() };
    await db.collection("events").add(event);
    if (user.role !== "admin") {
      const key = type === "play" ? "plays" : "downloads";
      await db
        .collection("releases")
        .doc(releaseId)
        .update({
          [`stats.${key}`]: FieldValue.increment(1),
          [`stats.byTrack.${trackId}.${key}`]: FieldValue.increment(1),
        });
    }
  } catch (e) {
    console.error("tracking: failed to record", type, releaseId, trackId, e);
  }
}
