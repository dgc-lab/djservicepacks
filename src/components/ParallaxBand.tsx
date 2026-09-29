"use client";

// 2026-09-29 Round 4: full-bleed parallax image band. The image drifts slower
// than the page scroll for depth; static when reduced motion is preferred.
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Motif } from "@/components/Motif";
import { Reveal } from "@/components/Reveal";

interface ParallaxBandProps {
  src: string;
  eyebrow: string;
  title: string;
  sub?: string;
}

export function ParallaxBand({ src, eyebrow, title, sub }: ParallaxBandProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <div ref={ref} className="relative h-[380px] overflow-hidden md:h-[460px]">
      <motion.img
        src={src}
        alt=""
        style={reduce ? undefined : { y }}
        className="absolute -top-[12%] left-0 h-[124%] w-full object-cover"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-charcoal via-charcoal/35 to-charcoal" />
      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <Reveal className="max-w-2xl text-center">
          <p className="flex items-center justify-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
            <Motif className="text-brand-500" />
            {eyebrow}
          </p>
          <p className="mt-3 font-display text-[clamp(1.8rem,4vw,3rem)] leading-tight tracking-tight text-paper">
            {title}
          </p>
          {sub ? <p className="mt-3 text-base leading-relaxed text-paper/65">{sub}</p> : null}
        </Reveal>
      </div>
    </div>
  );
}
