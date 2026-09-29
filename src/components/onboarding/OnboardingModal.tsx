"use client";

// 2026-09-29 Round 9: homepage modal that hosts the artist / DJ onboarding forms so
// the hero CTAs pop the signup right over the dark hero instead of navigating to a
// separate page. Bottom sheet on mobile, centered dialog on desktop.

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ArtistOnboardingForm } from "./ArtistOnboardingForm";
import { DjOnboardingForm } from "./DjOnboardingForm";

export type OnboardingKind = "artist" | "dj";

export function OnboardingModal({
  open,
  onClose,
}: {
  open: OnboardingKind | null;
  onClose: () => void;
}) {
  // lock body scroll while the modal is up
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={open === "artist" ? "Label and artist signup" : "DJ onboarding"}
        >
          <button
            type="button"
            aria-label="Close signup"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 48, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl p-4 pt-2 sm:rounded-3xl sm:p-0"
          >
            {/* aurora glow behind the sheet */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(240,168,33,0.16),rgba(244,114,182,0.08),transparent)] blur-2xl"
            />
            <div className="relative">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-3 right-3 z-10 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full bg-white/10 text-paper/80 backdrop-blur transition-colors hover:bg-white/20 hover:text-paper"
              >
                <X className="h-5 w-5" />
              </button>
              {open === "artist" ? <ArtistOnboardingForm /> : <DjOnboardingForm />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
