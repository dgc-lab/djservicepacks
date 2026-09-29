// 2026-09-28 18:05, admin: Stripe status + "Sync plans to Stripe" (creates products/prices from PLANS).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { isStripeConfigured, stripeMode, syncCatalog } from "@/lib/stripe";

export const runtime = "nodejs";

async function guard() {
  try {
    await requireRole("admin");
    return null;
  } catch (e) {
    const unauth = (e as Error).message === "UNAUTHORIZED";
    return NextResponse.json({ error: unauth ? "Sign in required" : "Admins only" }, { status: unauth ? 401 : 403 });
  }
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({
    configured: isStripeConfigured(),
    mode: stripeMode(),
    webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  });
}

export async function POST() {
  const denied = await guard();
  if (denied) return denied;
  if (!isStripeConfigured()) return NextResponse.json({ error: "Set STRIPE_SECRET_KEY first" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, log: await syncCatalog() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
