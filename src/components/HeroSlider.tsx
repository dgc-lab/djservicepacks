"use client";

// 2026-09-29 Round 5: two fixes for "arrows don't work well".
// 1) Autoplay clock restarts on every manual navigation (arrows AND dots) —
//    previously a click killed autoplay for good, which felt broken.
// 2) Controls were layered BEHIND the hero content (slider root is -z-20), so
//    the content div swallowed taps — on mobile the arrows were completely
//    unclickable. Controls now live in their own z-10 overlay with
//    pointer-events-none on the layer and auto on the buttons.
// Plus: pause on hover, preload every slide, bigger shadowed arrows.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface HeroSlide {
  src: string;
  alt: string;
  label: string;
}

interface HeroSliderProps {
  slides: HeroSlide[];
  autoplay?: boolean;
  interval?: number;
}

export function HeroSlider({ slides, autoplay = true, interval = 5000 }: HeroSliderProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [clock, setClock] = useState(0); // bump to restart the autoplay timer
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = slides.length;

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count),
    [count],
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
  useEffect(() => {
    if (!autoplay || paused || reduce || count < 2) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [autoplay, paused, interval, reduce, count, clock]);

  const manual = (dir: 1 | -1) => {
    go(dir);
    setClock((c) => c + 1);
  };

  const jumpTo = (i: number) => {
    setIndex(i);
    setClock((c) => c + 1);
  };

  const current = slides[index];

  return (
    <>
      {/* Background layer — images only, behind everything */}
      <div aria-hidden={false} className="absolute inset-0 -z-20 overflow-hidden bg-charcoal">
        <AnimatePresence initial={false}>
          <motion.img
            key={current.src}
            src={current.src}
            alt=""
            initial={reduce ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        {/* Contrast gradients for the headline (kept from the old static hero bg) */}
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/85 to-charcoal/40" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-charcoal to-transparent" />
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
