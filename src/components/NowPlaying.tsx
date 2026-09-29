"use client";

// 2026-09-28 00:20, release-page "now playing" bar: sticky bottom bar with cover, song,
// artist and the edit that's playing, plus play/pause. Also enforces one edit at a time.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface Controls {
  play: () => void;
  pause: () => void;
}

interface NowPlayingValue {
  /** A player started: pause whichever other edit was playing and show this one. */
  started: (id: string, label: string, controls: Controls) => void;
  /** A player paused or finished. */
  stopped: (id: string) => void;
}

const NowPlayingContext = createContext<NowPlayingValue | null>(null);

export function useNowPlaying() {
  return useContext(NowPlayingContext);
}

export function NowPlayingProvider({
  cover,
  songTitle,
  artistName,
  children,
}: {
  cover?: string;
  songTitle: string;
  artistName: string;
  children: ReactNode;
}) {
  const active = useRef<{ id: string; controls: Controls } | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const started = useCallback((id: string, lbl: string, controls: Controls) => {
    if (active.current && active.current.id !== id) active.current.controls.pause();
    active.current = { id, controls };
    setLabel(lbl);
    setPlaying(true);
  }, []);

  const stopped = useCallback((id: string) => {
    if (active.current?.id === id) setPlaying(false);
  }, []);

  // 2026-09-28 12:25, reserve room at the page bottom (below the footer) while the bar shows
  useEffect(() => {
    if (!label) return;
    document.body.style.paddingBottom = "5rem";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [label]);

  const toggle = () => {
    if (!active.current) return;
    if (playing) active.current.controls.pause();
    else active.current.controls.play();
  };

  return (
    <NowPlayingContext.Provider value={{ started, stopped }}>
      {children}
      {label && (
        <>
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-charcoal text-paper shadow-lg">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded bg-charcoal-soft text-sm font-black text-brand-400">
                  {songTitle.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{songTitle}</p>
                <p className="truncate text-xs text-paper/60">
                  {artistName} · <span className="text-brand-400">{label}</span>
                </p>
              </div>
              <button
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-sm text-charcoal hover:bg-brand-400"
              >
                {playing ? "❚❚" : "▶"}
              </button>
            </div>
          </div>
        </>
      )}
    </NowPlayingContext.Provider>
  );
}
