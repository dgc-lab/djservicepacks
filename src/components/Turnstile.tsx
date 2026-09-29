"use client";
// 2026-09-28 19:20, Cloudflare Turnstile widget (mostly invisible; shows a checkbox only when
// Cloudflare is unsure). Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set.
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("turnstile load failed")));
  });
}

/** Calls onToken with a fresh token (or null when it expires / errors). */
export function Turnstile({ onToken, resetKey }: { onToken: (t: string | null) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);
  // 2026-09-28 20:05, visible status so a failed challenge never looks like a dead button
  const [state, setState] = useState<"checking" | "interactive" | "ok" | "error">("checking");
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        idRef.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: "interaction-only",
          callback: (t: string) => {
            setState("ok");
            cb.current(t);
          },
          "before-interactive-callback": () => setState("interactive"),
          "expired-callback": () => {
            setState("checking");
            cb.current(null);
          },
          "error-callback": (code: string) => {
            console.warn(`turnstile error ${code}`);
            setState("error");
            cb.current(null);
          },
        });
      })
      .catch(() => {
        setState("error");
        cb.current(null);
      });
    return () => {
      cancelled = true;
      if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current);
      idRef.current = null;
    };
  }, []);

  // tokens are single-use: after a failed submit the parent bumps resetKey for a new one
  useEffect(() => {
    if (resetKey && idRef.current && window.turnstile) {
      setState("checking");
      cb.current(null);
      window.turnstile.reset(idRef.current);
    }
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <div className="space-y-1 text-center">
      <div ref={ref} className="flex justify-center" />
      {state === "checking" && <p className="text-xs text-ink-soft">Checking your browser…</p>}
      {state === "interactive" && <p className="text-xs text-ink-soft">Tick the box to continue.</p>}
      {state === "error" && (
        <p className="text-xs text-red-700">
          We couldn&apos;t verify your browser. Refresh the page, or try another browser / turn off strict ad-blocking.
        </p>
      )}
    </div>
  );
}

/** Hidden honeypot input — real people never see or fill it. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
