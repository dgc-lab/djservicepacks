// 2026-09-28 18:05, start (or change) a paid plan. New subscribers go to Stripe Checkout
// (with an optional +10 GB storage add-on); existing subscribers are switched in place with
// proration, so nobody ends up with two subscriptions.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { APP_TAG, SITE, getStripe, isStripeConfigured, priceIdFor } from "@/lib/stripe";
import { PLANS, STORAGE_ADDON_ID, lookupKey, type BillingInfo, type BillingInterval } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let user;
  try {
    user = await requireRole("artist", "label");
  } catch (e) {
    const unauth = (e as Error).message === "UNAUTHORIZED";
    return NextResponse.json({ error: unauth ? "Sign in required" : "Artists and labels only" }, { status: unauth ? 401 : 403 });
  }
  if (!isStripeConfigured()) return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { planId?: string; interval?: BillingInterval };
  const interval: BillingInterval = body.interval === "yearly" ? "yearly" : "monthly";
  const plan = PLANS.find((p) => p.id === body.planId);
  if (!plan || plan.price <= 0) return NextResponse.json({ error: "Pick a paid plan" }, { status: 400 });
  if (plan.role !== user.role) {
    return NextResponse.json({ error: `${plan.name} is for ${plan.role} accounts` }, { status: 400 });
  }

  const priceId = await priceIdFor(lookupKey(plan.id, interval));
  if (!priceId) return NextResponse.json({ error: "That plan isn't in Stripe yet — ask an admin to sync plans." }, { status: 503 });

  const stripe = getStripe();
  const userRef = getAdminDb().collection("users").doc(user.uid);
  const billing = ((await userRef.get()).data()?.billing ?? {}) as BillingInfo;

  // Already subscribed: swap the plan item on the existing subscription.
  if (billing.subscriptionId && ["active", "trialing", "past_due"].includes(billing.status ?? "")) {
    const sub = await stripe.subscriptions.retrieve(billing.subscriptionId);
    const planItem = sub.items.data.find((it) => !(it.price.lookup_key ?? "").includes(`${STORAGE_ADDON_ID}_`));
    if (!planItem) return NextResponse.json({ error: "Couldn't find your current plan in Stripe" }, { status: 500 });
    if (planItem.price.id === priceId) return NextResponse.json({ error: "You're already on that plan" }, { status: 400 });
    await stripe.subscriptions.update(sub.id, {
      items: [{ id: planItem.id, price: priceId }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false,
      metadata: { app: APP_TAG, uid: user.uid, planId: plan.id },
    });
    return NextResponse.json({ url: `${SITE}/dashboard/billing?changed=1` });
  }

  const addonPrice = await priceIdFor(lookupKey(STORAGE_ADDON_ID, interval));
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    ...(addonPrice && plan.storageBytes > 0
      ? { optional_items: [{ price: addonPrice, quantity: 1, adjustable_quantity: { enabled: true, minimum: 1, maximum: 20 } }] }
      : {}),
    ...(billing.customerId ? { customer: billing.customerId } : { customer_email: user.email ?? undefined }),
    client_reference_id: user.uid,
    subscription_data: { metadata: { app: APP_TAG, uid: user.uid, planId: plan.id } },
    metadata: { app: APP_TAG, uid: user.uid },
    allow_promotion_codes: true,
    success_url: `${SITE}/dashboard/billing?checkout=success`,
    cancel_url: `${SITE}/dashboard/billing?checkout=cancelled`,
  });
  return NextResponse.json({ url: session.url });
}
