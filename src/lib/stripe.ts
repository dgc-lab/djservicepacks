// 2026-09-28 18:00, Stripe billing. Subscriptions via Checkout, self-service via the Billing
// Portal, state written to users/{uid}.billing by the webhook. Prices are found by lookup key
// (see lookupKey in types.ts) so no price ids live in env or code.
//   STRIPE_SECRET_KEY=sk_test_… / sk_live_…
//   STRIPE_WEBHOOK_SECRET=whsec_…   (endpoint: https://djservicepacks.com/api/billing/webhook)
import "server-only";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  PLANS,
  STORAGE_ADDON,
  STORAGE_ADDON_ID,
  YEARLY_MONTHS,
  LOOKUP_PREFIX,
  lookupKey,
  type BillingInfo,
  type BillingInterval,
} from "@/lib/types";

export const SITE = process.env.SITE_URL || "https://djservicepacks.com";

// 2026-09-28 21:10, the Stripe account is shared (Muziki, FoodTruck Express, …): everything this
// app creates is tagged app=djservicepacks, and the webhook ignores anything not tagged/keyed so.
export const APP_TAG = "djservicepacks";

/** True when a subscription belongs to this app (tag or djsp_ price lookup keys). */
export function isOurSubscription(sub: Stripe.Subscription): boolean {
  return (
    sub.metadata?.app === APP_TAG ||
    sub.items.data.some((it) => (it.price.lookup_key ?? "").startsWith(LOOKUP_PREFIX))
  );
}

let client: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Lazy client (the SDK throws at import time without a key, which would break builds). */
export function getStripe(): Stripe {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  return client;
}

export function stripeMode(): "live" | "test" | null {
  const k = process.env.STRIPE_SECRET_KEY ?? "";
  return k.startsWith("sk_live_") || k.startsWith("rk_live_") ? "live" : k ? "test" : null;
}

const priceCache = new Map<string, { id: string; at: number }>();

/** Price id for a lookup key (cached 10 min). */
export async function priceIdFor(key: string): Promise<string | null> {
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.id;
  const res = await getStripe().prices.list({ lookup_keys: [key], active: true, limit: 1 });
  const id = res.data[0]?.id ?? null;
  if (id) priceCache.set(key, { id, at: Date.now() });
  return id;
}

/** Every product/price the site sells, derived from PLANS (+ the storage add-on). */
function catalog() {
  const items = PLANS.filter((p) => p.price > 0).map((p) => ({
    id: p.id,
    name: `DJ Service Packs — ${p.name}`,
    description: p.features.join(" · "),
    cents: Math.round(p.price * 100),
  }));
  items.push({
    id: STORAGE_ADDON_ID,
    name: "DJ Service Packs — +10 GB storage",
    description: `Extra ${Math.round(STORAGE_ADDON.bytes / 1024 ** 3)} GB of hosted storage`,
    cents: Math.round(STORAGE_ADDON.price * 100),
  });
  return items;
}

/**
 * Create/refresh Stripe products + monthly/yearly prices for the catalog. Idempotent: a price
 * whose amount already matches is left alone; a changed amount gets a new price that takes over
 * the lookup key (old subscribers keep their old price until they change plan).
 */
export async function syncCatalog(): Promise<string[]> {
  const stripe = getStripe();
  const log: string[] = [];
  for (const item of catalog()) {
    const keys = (["monthly", "yearly"] as BillingInterval[]).map((i) => lookupKey(item.id, i));
    const existing = (await stripe.prices.list({ lookup_keys: keys, limit: 10, expand: ["data.product"] })).data;
    let productId =
      (existing[0]?.product as Stripe.Product | undefined)?.id ??
      (
        await stripe.products
          .search({ query: `metadata['app']:'${APP_TAG}' AND metadata['planId']:'${item.id}'` })
          .catch(() => ({ data: [] as Stripe.Product[] }))
      ).data[0]?.id;
    if (!productId) {
      productId = (
        await stripe.products.create({
          name: item.name,
          description: item.description,
          metadata: { app: APP_TAG, planId: item.id },
        })
      ).id;
      log.push(`created product ${item.id}`);
    } else {
      await stripe.products.update(productId, { name: item.name, description: item.description });
    }
    for (const interval of ["monthly", "yearly"] as BillingInterval[]) {
      const key = lookupKey(item.id, interval);
      const amount = interval === "monthly" ? item.cents : item.cents * YEARLY_MONTHS;
      const cur = existing.find((p) => p.lookup_key === key);
      if (cur && cur.unit_amount === amount && cur.active) {
        log.push(`ok ${key} $${(amount / 100).toFixed(2)}`);
        continue;
      }
      await stripe.prices.create({
        product: productId,
        currency: "usd",
        unit_amount: amount,
        recurring: { interval: interval === "monthly" ? "month" : "year" },
        lookup_key: key,
        transfer_lookup_key: true,
        metadata: { app: APP_TAG, planId: item.id, interval },
      });
      priceCache.delete(key);
      log.push(`${cur ? "repriced" : "created"} ${key} $${(amount / 100).toFixed(2)}`);
    }
  }

  // Our own (non-default) Billing Portal configuration — the account default belongs to the
  // other apps, so portal sessions pass this configuration explicitly.
  if (!(await portalConfigId())) {
    const features = {
      customer_update: { enabled: true, allowed_updates: ["email", "address", "name"] as ("email" | "address" | "name")[] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" as const },
    };
    const mine = () =>
      stripe.billingPortal.configurations.create({
        business_profile: { headline: "DJ Service Packs — manage your plan" },
        features,
        default_return_url: `${SITE}/dashboard/billing`,
        metadata: { app: APP_TAG },
      });
    const created = await mine();
    // On an account with no portal yet, the first configuration becomes the account default,
    // which the other apps would inherit. Make that one neutral and create a separate one for us.
    if (created.is_default) {
      await stripe.billingPortal.configurations.update(created.id, {
        business_profile: { headline: "" },
        default_return_url: "",
        metadata: { app: "" },
      });
      await mine();
      log.push("created neutral default portal configuration (account had none)");
    }
    portalCache = null;
    log.push("created billing portal configuration");
  } else {
    log.push("ok billing portal configuration");
  }
  return log;
}

let portalCache: string | null = null;

/** Id of this app's Billing Portal configuration (null until syncCatalog creates it). */
export async function portalConfigId(): Promise<string | null> {
  if (portalCache) return portalCache;
  for await (const c of getStripe().billingPortal.configurations.list({ active: true, limit: 100 })) {
    if (c.metadata?.app === APP_TAG) {
      portalCache = c.id;
      return c.id;
    }
  }
  return null;
}

/** Split a subscription into { planId, interval, addons } using its prices' lookup keys. */
function readSubscription(sub: Stripe.Subscription) {
  let planId: string | null = null;
  let interval: BillingInterval | null = null;
  let storageAddons = 0;
  let periodEnd = 0;
  for (const it of sub.items.data) {
    const key = it.price.lookup_key ?? "";
    const m = key.startsWith(LOOKUP_PREFIX) ? key.slice(LOOKUP_PREFIX.length).match(/^(.+)_(monthly|yearly)$/) : null;
    periodEnd = Math.max(periodEnd, it.current_period_end ?? 0);
    if (!m) continue;
    if (m[1] === STORAGE_ADDON_ID) storageAddons += it.quantity ?? 0;
    else {
      planId = m[1];
      interval = m[2] as BillingInterval;
    }
  }
  return { planId, interval, storageAddons, periodEnd };
}

/** Write a subscription's state onto its user (uid from subscription metadata or customer lookup). */
export async function applySubscription(sub: Stripe.Subscription, uidHint?: string | null) {
  if (!isOurSubscription(sub)) return; // another app's subscription on the shared account
  const db = getAdminDb();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let uid = uidHint || sub.metadata?.uid || null;
  if (!uid) {
    const q = await db.collection("users").where("billing.customerId", "==", customerId).limit(1).get();
    uid = q.docs[0]?.id ?? null;
  }
  if (!uid) {
    console.warn(`stripe: no user for customer ${customerId} (subscription ${sub.id})`);
    return;
  }
  const { planId, interval, storageAddons, periodEnd } = readSubscription(sub);
  const billing: BillingInfo = {
    customerId,
    subscriptionId: sub.id,
    status: sub.status,
    interval,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    storageAddons,
    updatedAt: new Date().toISOString(),
  };
  const update: Record<string, unknown> = { billing };
  // A paid subscription replaces any comp; the plan follows what they pay for.
  if (planId && sub.status !== "canceled" && sub.status !== "incomplete_expired") {
    update.plan = planId;
    update.planComped = false;
  }
  await db.collection("users").doc(uid).set(update, { merge: true });
}
