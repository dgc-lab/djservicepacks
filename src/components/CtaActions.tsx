import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 2026-09-29 Round 2 — final CTA actions.
 * Tried the GodUI multi-button here first: its labels only bloom on hover,
 * so the CTA read as three mystery icons at rest (and on touch). A primary
 * CTA has to read on first glance — plain labeled buttons win.
 */
export function CtaActions() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <Button size="lg">
        <Link href="/onboarding/artist">Upload a single</Link>
      </Button>
      <Button size="lg" variant="secondary">
        <Link href="/onboarding/artist">Label catalog</Link>
      </Button>
      <Link
        href="/onboarding/dj"
        className="inline-flex h-12 items-center justify-center rounded-md border border-paper/25 px-6 text-base font-semibold text-paper transition-all hover:bg-paper/10 active:scale-[0.98]"
      >
        DJ? Get verified — free
      </Link>
    </div>
  );
}
