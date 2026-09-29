// 2026-09-28 18:05, Stripe Billing Portal: card, invoices, cancel.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { SITE, getStripe, isStripeConfigured, portalConfigId } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  let user;
  try {
    user = await requireRole("artist", "label");
  } catch (e) {
    const unauth = (e as Error).message === "UNAUTHORIZED";
    return NextResponse.json({ error: unauth ? "Sign in required" : "Artists and labels only" }, { status: unauth ? 401 : 403 });
  }
  if (!isStripeConfigured()) return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });
  const customerId = (await getAdminDb().collection("users").doc(user.uid).get()).data()?.billing?.customerId;
  if (!customerId) return NextResponse.json({ error: "No billing account yet — pick a plan first." }, { status: 400 });
  // 2026-09-28 21:10, this app's own portal configuration (the account default is shared)
  const configuration = await portalConfigId();
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    ...(configuration ? { configuration } : {}),
    return_url: `${SITE}/dashboard/billing`,
  });
  return NextResponse.json({ url: session.url });
}
