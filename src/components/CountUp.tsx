"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 2026-09-29 Round 1 (V3 dialed-in) — count-up number for the hero stat strip.
 * Animates once when scrolled into view; renders the final value immediately
 * under prefers-reduced-motion or without JS.
 */
export function CountUp({
  to,
  pad = 2,
  suffix = "",
}: {
  to: number;
  pad?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const dur = 1100;
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return (
    <span ref={ref}>
      {String(n).padStart(pad, "0")}
      {suffix}
    </span>
  );
}
