"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Motif } from "@/components/Motif";
import { cn } from "@/lib/cn";

/**
 * 2026-09-29 Round 1 (V3 dialed-in) — sticky site nav.
 * Transparent over the hero, solid charcoal once scrolled. Deliberately NO
 * backdrop-filter/transform/filter on the header: per the containing-block
 * rule, any of those would silently become the containing block for the
 * full-screen mobile overlay and collapse it to the header's box.
 * The mobile menu renders through a portal to document.body so no header
 * styles can ever contain it.
 */

const anchorLinks = [
  { href: "#standard", label: "The standard" },
  { href: "#for-djs", label: "For DJs" },
  { href: "#latest", label: "Latest" },
];

const menuGroups = [
  {
    id: "explore",
    label: "Explore",
    links: [
      { href: "#standard", label: "The standard" },
      { href: "#for-djs", label: "For DJs" },
      { href: "#latest", label: "Latest releases" },
    ],
  },
  {
    id: "start",
    label: "Get started",
    links: [
      { href: "/onboarding/artist", label: "Upload a service pack" },
      { href: "/onboarding/dj", label: "DJ verification" },
      { href: "/login", label: "Sign in" },
    ],
  },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn(
        "h-4 w-4 text-brand-400 transition-transform duration-300",
        open && "rotate-180"
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-charcoal text-paper"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-6 py-5"
        onClick={(e) => e.stopPropagation()}
      >
        <Logo tone="light" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="grid h-11 w-11 place-items-center rounded-md border border-paper/25 text-paper transition-colors hover:bg-paper/10"
        >
          <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-6 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mt-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-brand-400">
          <Motif />
          <span>In every crate</span>
        </div>

        <div className="mt-6 divide-y divide-paper/10 border-y border-paper/10">
          {menuGroups.map((group) => {
            const open = openGroup === group.id;
            return (
              <div key={group.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenGroup(open ? null : group.id)}
                  className="flex w-full items-center justify-between py-5 text-left"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.22em] text-paper/60">
                    {group.label}
                  </span>
                  <Chevron open={open} />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <ul className="min-h-0 overflow-hidden">
                    {group.links.map((l) => (
                      <li key={l.href + l.label}>
                        <Link
                          href={l.href}
                          onClick={onClose}
                          className="flex items-center gap-3 py-3 text-2xl font-bold text-paper transition-colors hover:text-brand-400"
                        >
                          <Motif className="h-3 w-3 text-brand-500" />
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Featured: gold-accented card */}
        <Link
          href="/onboarding/dj"
          onClick={onClose}
          className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-brand-500/40 bg-brand-500/10 p-5 transition-colors hover:bg-brand-500/15"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand-400">
              Featured
            </p>
            <p className="mt-1 text-lg font-bold text-paper">
              DJ? Get verified — free
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-500 text-xl font-black text-charcoal">
            →
          </span>
        </Link>
      </nav>
    </div>,
    document.body
  );
}

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
          // Solid on scroll — no blur (containing-block rule).
          scrolled
            ? "border-b border-paper/10 bg-charcoal/[0.97]"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
          <Logo tone="light" />

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
            {anchorLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-paper/70 transition-colors hover:text-paper"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="text-sm font-medium text-paper/70 transition-colors hover:text-paper"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding/artist"
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand-500 px-4 text-sm font-bold text-charcoal shadow-[0_10px_28px_-10px_rgba(240,168,33,0.65)] transition-all hover:bg-brand-400 active:scale-[0.98]"
            >
              Upload a service pack
            </Link>
          </nav>

          {/* Explicit button treatment — a motif mark alone doesn't read as tappable */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-paper/25 px-4 text-sm font-semibold text-paper transition-colors hover:bg-paper/10 md:hidden"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
            Menu
          </button>
        </div>
      </header>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </>
  );
}
