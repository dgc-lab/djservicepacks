import { cn } from "@/lib/cn";

/**
 * 2026-09-29 Round 1 (V3 dialed-in) — brand motif: a minimal vinyl-record mark.
 * A circle with a center hole: the crate-culture signature. Sits in the nav,
 * leads every eyebrow, and punctuates the footer. Verbal tag: "in every crate".
 */
export function Motif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      className={cn("h-3.5 w-3.5 shrink-0", className)}
    >
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="8" cy="8" r="1.7" fill="currentColor" />
    </svg>
  );
}
