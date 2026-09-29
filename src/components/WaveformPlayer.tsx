"use client";

import { useEffect, useId, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { useNowPlaying } from "@/components/NowPlaying";

/**
 * Client waveform + playback for a single audio asset.
 * Renders a fallback if the URL isn't available yet.
 */
export function WaveformPlayer({
  url,
  title,
  fallbackHref,
  trackLabel,
  track,
}: {
  url?: string;
  title: string;
  /** 2026-09-28 00:20, shown in the now-playing bar (e.g. "Dirty / Explicit") when inside a NowPlayingProvider. */
  trackLabel?: string;
  /** 2026-09-28 13:05, when set, the first play of this edit is recorded as a play event. */
  track?: { releaseId: string; trackId: string };
  /** Shown as an "Open original" link if `url` fails to load inline (e.g. a non-direct external link). */
  fallbackHref?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // 2026-09-27 03:00, load on first play only — a release page used to download every edit
  // in full (twice) on open (~100 MB for a 7-edit pack)
  const [activated, setActivated] = useState(false);
  const [loading, setLoading] = useState(false);
  const playerId = useId();
  const nowPlaying = useNowPlaying();
  // keep the latest context/label in refs so the WaveSurfer effect doesn't re-create on change
  const nowPlayingRef = useRef(nowPlaying);
  const labelRef = useRef(trackLabel ?? title);
  const trackRef = useRef(track);
  const playCounted = useRef(false);
  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
    labelRef.current = trackLabel ?? title;
    trackRef.current = track;
  });

  useEffect(() => {
    if (!activated || !url || !containerRef.current) return;
    setLoading(true);
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#d9920f",
      progressColor: "#f0a821",
      barWidth: 2,
      barGap: 1,
      height: 48,
      cursorColor: "#0f0e0b",
      url,
      autoplay: true,
    });
    wsRef.current = ws;
    ws.on("ready", () => {
      setReady(true);
      setLoading(false);
      setFailed(false);
    });
    ws.on("play", () => {
      setPlaying(true);
      // count one play per edit per page view (pause/resume doesn't re-count)
      if (trackRef.current && !playCounted.current) {
        playCounted.current = true;
        fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "play", ...trackRef.current }),
          keepalive: true,
        }).catch(() => undefined);
      }
      nowPlayingRef.current?.started(playerId, labelRef.current, {
        play: () => ws.play(),
        pause: () => ws.pause(),
      });
    });
    ws.on("pause", () => {
      setPlaying(false);
      nowPlayingRef.current?.stopped(playerId);
    });
    ws.on("finish", () => {
      setPlaying(false);
      nowPlayingRef.current?.stopped(playerId);
    });
    ws.on("error", () => {
      setReady(false);
      setLoading(false);
      setFailed(true);
    });

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [url, activated, playerId]);

  const toggle = () => {
    if (!activated) {
      setActivated(true);
      return;
    }
    const ws = wsRef.current;
    if (!ws) return;
    if (playing) ws.pause();
    else ws.play();
  };

  if (!url) {
    return <p className="truncate text-xs text-ink/40">No preview available</p>;
  }

  if (failed && fallbackHref) {
    return (
      <a
        href={fallbackHref}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-semibold text-brand-700 hover:underline"
      >
        Open original ↗
      </a>
    );
  }

  return (
    <div>
      <button
        onClick={toggle}
        disabled={activated && !ready}
        className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink disabled:opacity-50"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-xs text-charcoal">
          {playing ? "❚❚" : "▶"}
        </span>
        {loading ? "Loading…" : title}
      </button>
      <div ref={containerRef} />
    </div>
  );
}