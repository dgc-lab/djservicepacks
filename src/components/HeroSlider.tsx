"use client";

// 2026-09-29 Round 5: two fixes for "arrows don't work well".
// 1) Autoplay clock restarts on every manual navigation (arrows AND dots) —
//    previously a click killed autoplay for good, which felt broken.
// 2) Controls were layered BEHIND the hero content (slider root is -z-20), so
//    the content div swallowed taps — on mobile the arrows were completely
//    unclickable. Controls now live in their own z-10 overlay with
//    pointer-events-none on the layer and auto on the buttons.
// Plus: pause on hover, preload every slide, bigger shadowed arrows.
//
// 2026-09-29 Round 10: hero operator controls, ported from the Prime Time
// module — transition picker (fade / slide / dip-to-black / punch-in),
// Ken Burns drift, film grain, and parallax. Defaults match the approved
// config: fade, Ken Burns on, grain off, parallax off. Reduced motion
// forces a plain instant crossfade with all animation stripped.
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

export interface HeroSlide {
  src: string;
  alt: string;
  label: string;
}

export type HeroTransition = "fade" | "slide" | "dip" | "punch";

interface HeroSliderProps {
  slides: HeroSlide[];
  autoplay?: boolean;
  interval?: number;
  transition?: HeroTransition;
  kenBurns?: boolean;
  filmGrain?: boolean;
  parallax?: boolean;
}

const DIP_IN_MS = 430;
const DIP_OUT_MS = 880;

export function HeroSlider({
  slides,
  autoplay = true,
  interval = 5000,
  transition = "fade",
  kenBurns = true,
  filmGrain = false,
  parallax = false,
}: HeroSliderProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [dipping, setDipping] = useState(false);
  const [paused, setPaused] = useState(false);
  const [clock, setClock] = useState(0); // bump to restart the autoplay timer
  const [parY, setParY] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearTimer = useRef<number | null>(null);
  const count = slides.length;

  // Reduced motion: plain crossfade, animation stripped in CSS.
  const fx: HeroTransition = reduce ? "fade" : transition;

  const show = useCallback(
    (next: number, d: 1 | -1) => {
      if (next === index) return;
      if (clearTimer.current) clearTimeout(clearTimer.current);
      if (fx === "dip") {
        // Dip to black: overlay fades in, slide swaps underneath, overlay out.
        setDipping(true);
        setDir(d);
        window.setTimeout(() => {
          setIndex(next);
          setPrevIndex(null);
        }, DIP_IN_MS);
        window.setTimeout(() => setDipping(false), DIP_OUT_MS);
      } else {
        setPrevIndex(index);
        setIndex(next);
        setDir(d);
        const hold = fx === "fade" ? 1450 : 950;
        clearTimer.current = window.setTimeout(() => setPrevIndex(null), hold);
      }
    },
    [index, fx],
  );
  // Preload every slide up front — no blank flash on first transition.
  useEffect(() => {
    slides.forEach((s) => {
      const img = new Image();
      img.src = s.src;
    });
  }, [slides]);

  // Autoplay — paused on hover, reduced motion, or when disabled. The clock
  // restarts after any manual navigation so the slide never jumps away.
  // Routes through show() so the active transition (incl. dip) always plays.
  // show/index in deps: the interval restarts on every advance, which keeps
  // timing consistent across transition types.
  useEffect(() => {
    if (!autoplay || paused || reduce || count < 2) return;
    timer.current = setInterval(() => show((index + 1) % count, 1), interval);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [autoplay, paused, interval, reduce, count, clock, show, index]);

  // Parallax — the slides layer drifts with page scroll (subtle, clamped).
  // When parallax is off the fx-px class and --fx-par style are unset, so a
  // stale parY value is fully inert — no reset needed here.
  useEffect(() => {
    if (!parallax || reduce) return;
    const onScroll = () => setParY(Math.min(window.scrollY * 0.28, 160));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [parallax, reduce]);

  useEffect(
    () => () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    [],
  );

  const manual = (d: 1 | -1) => {
    if (dipping) return;
    show((index + d + count) % count, d);
    setClock((c) => c + 1);
  };

  const jumpTo = (i: number) => {
    if (dipping) return;
    show(i, i > index ? 1 : -1);
    setClock((c) => c + 1);
  };

  const current = slides[index];

  return (
    <>
      {/* Background layer — images only, behind everything */}
      <div
        aria-hidden={false}
        data-transition={fx}
        data-dir={dir === 1 ? "next" : "prev"}
        className={cn(
          "fx-root absolute inset-0 -z-20 overflow-hidden bg-charcoal",
          kenBurns && !reduce && "fx-kb",
          filmGrain && "fx-grain-on",
          parallax && !reduce && "fx-px",
        )}
      >
        <div
          className="fx-slides absolute inset-0"
          style={
            parallax && !reduce
              ? ({ "--fx-par": `${parY}px` } as CSSProperties)
              : undefined
          }
        >
          {slides.map((s, i) => (
            <div
              key={s.src}
              aria-hidden
              className={cn(
                "fx-slide",
                i === index && "is-active",
                i === prevIndex && "was-active",
              )}
            >
              <img
                src={s.src}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Dip-to-black overlay */}
        <div aria-hidden className={cn("fx-dip", dipping && "is-dipping")} />
        {/* Film grain overlay */}
        <div aria-hidden className="fx-grain" />

        {/*
          Contrast gradients for the headline (kept from the old static hero bg).
          2026-09-29 Round 13: these need z-[3] — the active slide sits at z-1/z-2
          (Round 10's CSS transition rewrite), which was burying the gradients
          and washing the hero out. They must paint above the slides.
        */}
        <div className="absolute inset-0 z-[3] bg-gradient-to-r from-charcoal via-charcoal/85 to-charcoal/40" />
        <div className="absolute inset-x-0 bottom-0 z-[3] h-24 bg-gradient-to-t from-charcoal to-transparent" />
      </div>

      {/* Controls layer — above the hero content, clicks pass through except on buttons */}
      {count > 1 ? (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <button
            type="button"
            onClick={() => manual(-1)}
            aria-label="Previous hero image"
            className="pointer-events-auto absolute left-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-paper/20 bg-black/50 text-paper shadow-[0_12px_32px_-10px_rgba(0,0,0,0.9)] backdrop-blur-sm transition-all hover:scale-105 hover:border-brand-400/60 hover:bg-black/70 active:scale-95 md:left-8 md:size-14"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => manual(1)}
            aria-label="Next hero image"
            className="pointer-events-auto absolute right-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-paper/20 bg-black/50 text-paper shadow-[0_12px_32px_-10px_rgba(0,0,0,0.9)] backdrop-blur-sm transition-all hover:scale-105 hover:border-brand-400/60 hover:bg-black/70 active:scale-95 md:right-8 md:size-14"
          >
            <ChevronRight className="size-6" />
          </button>

          {/* Dots + caption */}
          <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-2">
            <p className="rounded-full border border-paper/15 bg-black/45 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/70 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              {current.label}
            </p>
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={`Show ${s.label}`}
                  className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-brand-400" : "w-1.5 bg-paper/35 hover:bg-paper/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
