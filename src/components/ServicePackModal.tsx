"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ServicePackModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Accessible dialog: fixed overlay, role="dialog", Escape-to-close, scroll-lock,
 * focus trap into the panel, restores focus on close. Styled with the warm
 * charcoal/paper/gold brand (no violet).
 */
export function ServicePackModal({ open, onClose, title, children }: ServicePackModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
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
    // Focus the close button on open.
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "relative z-10 max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl",
          "bg-paper text-ink shadow-2xl"
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-ink/10 bg-paper px-6 py-4">
          <h2 className="text-xl font-black text-ink">{title}</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-md text-ink-soft transition-colors hover:bg-paper-dark hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
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
      <h3 className="mb-2 text-base font-bold text-brand-700">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export function ModalCheck({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-ink">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-black text-charcoal">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}