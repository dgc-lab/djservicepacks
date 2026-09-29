// 2026-09-28 18:05, Stripe webhook → users/{uid}.billing. Subscribe in the Stripe dashboard to:
// checkout.session.completed, customer.subscription.created, customer.subscription.updated,
// customer.subscription.deleted. Signature-verified against the raw body.
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { APP_TAG, applySubscription, getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        // 2026-09-28 21:10, shared Stripe account: only this app's checkouts
        if (s.mode !== "subscription" || !s.subscription || s.metadata?.app !== APP_TAG) break;
        const uid = s.client_reference_id;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
        if (uid && customerId) {
          await getAdminDb().collection("users").doc(uid).set({ billing: { customerId } }, { merge: true });
        }
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
        await applySubscription(await getStripe().subscriptions.retrieve(subId), uid);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscription(event.data.object);
        break;
    }
  } catch (e) {
    console.error(`stripe webhook ${event.type} failed`, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
