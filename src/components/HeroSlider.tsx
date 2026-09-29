"use client";

// 2026-09-29 Round 4: full-bleed hero background slider. Crossfading slides with
// prev/next arrows that stay visible on desktop AND mobile, dot indicators, and
// a caption chip. Autoplay is driven by props so the hero settings panel can
// control it.
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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = slides.length;

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count),
    [count],
  );

  // Autoplay — paused when reduced motion is on, restarted on any setting change.
  useEffect(() => {
    if (!autoplay || reduce || count < 2) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [autoplay, interval, reduce, count]);

  const manual = (dir: 1 | -1) => {
    // Manual navigation resets the autoplay clock so the slide doesn't jump away.
    if (timer.current) clearInterval(timer.current);
    go(dir);
  };

  const current = slides[index];

  return (
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

      {/* Prev / next — always visible, desktop included */}
      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => manual(-1)}
            aria-label="Previous hero image"
            className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-paper/20 bg-black/45 text-paper backdrop-blur-sm transition-all hover:border-brand-400/60 hover:bg-black/65 active:scale-95 md:left-6 md:size-12"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => manual(1)}
            aria-label="Next hero image"
            className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-paper/20 bg-black/45 text-paper backdrop-blur-sm transition-all hover:border-brand-400/60 hover:bg-black/65 active:scale-95 md:right-6 md:size-12"
          >
            <ChevronRight className="size-5" />
          </button>

          {/* Dots + caption */}
          <div className="absolute inset-x-0 bottom-5 z-10 flex flex-col items-center gap-2">
            <p className="rounded-full border border-paper/15 bg-black/45 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/70 backdrop-blur-sm">
              {current.label}
            </p>
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${s.label}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-brand-400" : "w-1.5 bg-paper/35 hover:bg-paper/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
