// 2026-09-28 19:20, signup bot protection (all layers checked server-side in the onboarding APIs):
//  1. Cloudflare Turnstile token (NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY)
//  2. honeypot field (hidden "website" input humans never fill)
//  3. minimum time on the form (bots submit instantly)
//  4. per-IP rate limit on signups
// The Firebase Auth user is created client-side before onboarding, so a rejected signup also
// deletes that auth user — a bot never keeps an account.
import "server-only";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export interface BotFields {
  turnstileToken?: string;
  website?: string; // honeypot
  formStartedAt?: number; // ms epoch when the form rendered
}

const MIN_FILL_MS = 3000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5; // signups per IP per hour
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function turnstileConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  if (!turnstileConfigured()) {
    // Not set up yet: the other layers still apply. Production should always have keys.
    console.warn("botguard: Turnstile keys not set — signup allowed without a challenge");
    return true;
  }
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, remoteip: ip }),
      cache: "no-store",
    });
    const d = (await res.json()) as { success?: boolean };
    return Boolean(d.success);
  } catch (e) {
    console.error("botguard: Turnstile verify failed", e);
    return false; // fail closed when the challenge is configured but unverifiable
  }
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_MAX;
}

/** null = looks human; otherwise the reason (logged, never shown in detail to the client). */
export async function checkSignup(req: Request, f: BotFields): Promise<string | null> {
  const ip = clientIp(req);
  if (f.website) return "honeypot";
  if (!f.formStartedAt || Date.now() - f.formStartedAt < MIN_FILL_MS) return "too-fast";
  if (ip !== "unknown" && rateLimited(ip)) return "rate-limit";
  if (!(await verifyTurnstile(f.turnstileToken, ip))) return "challenge";
  return null;
}

/** Remove the auth user a rejected signup just created (best effort). */
export async function discardAuthUser(uid: string) {
  await getAdminAuth()
    .deleteUser(uid)
    .catch(() => {});
}
