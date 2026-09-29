"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface ServicePackModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * 2026-09-29 Round 2 — redesigned as a bottom sheet (was a centered card).
 * Jon's note: the old popup blocked the view, was hard to close, and the page
 * behind bled through oddly. Now: slides up from the bottom on mobile, centers
 * on desktop, darker backdrop, big drag handle + X, tap-backdrop and Escape to
 * close. Dark charcoal card with gold accents — no more white panel.
 * Renders through a portal so no ancestor styles can contain it.
 */
export function ServicePackModal({ open, onClose, title, children }: ServicePackModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — darker than before so nothing bleeds through */}
      <div
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        className={cn(
          "animate-sheet-up relative z-10 flex max-h-[88dvh] w-full max-w-2xl flex-col",
          "overflow-hidden rounded-t-3xl bg-charcoal text-paper",
          "border border-paper/10 shadow-[0_-8px_60px_rgba(0,0,0,0.6)]",
          "md:rounded-3xl md:shadow-2xl"
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 md:hidden" aria-hidden="true">
          <span className="h-1.5 w-12 rounded-full bg-paper/25" />
        </div>
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <h2 className="font-display text-2xl tracking-tight text-paper">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-paper/20 text-paper transition-colors hover:bg-paper/10"
          >
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-8">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function ModalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-base font-bold text-brand-400">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-paper/70">{children}</div>
    </section>
  );
}

export function ModalCheck({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-paper">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-black text-charcoal">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
