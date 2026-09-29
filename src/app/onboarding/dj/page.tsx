"use client";

// 2026-09-29 Round 9: thin wrapper — the form lives in
// src/components/onboarding/DjOnboardingForm.tsx (shared with the homepage modal).
// Page chrome went dark to match the site aesthetic.

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { DjOnboardingForm } from "@/components/onboarding/DjOnboardingForm";

export default function DjOnboardingPage() {
  return (
    <main className="relative flex min-h-screen flex-1 justify-center overflow-hidden bg-ink px-4 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(240,168,33,0.14),rgba(244,114,182,0.07),transparent)] blur-3xl"
      />
      <div className="relative w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" aria-label="Back to home">
            <Logo />
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-paper/70 hover:text-paper hover:underline"
          >
            Sign in
          </Link>
        </div>

        <DjOnboardingForm />

        <p className="mt-6 text-center text-sm text-paper/45">
          <Link href="/" className="hover:text-paper/80 hover:underline">
            ← Back to DJ Service Packs
          </Link>
        </p>
      </div>
    </main>
  );
}
