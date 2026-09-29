// 2026-09-28 18:20, artist/label billing: current plan + status, Stripe portal, upgrade cards.
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingPlans } from "@/components/PricingPlans";
import { requirePageRole } from "@/lib/session";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { effectivePlan, formatPlanPrice, type BillingInfo } from "@/lib/types";
import { ManageBilling } from "./ManageBilling";

export const dynamic = "force-dynamic";

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageRole("/dashboard/billing", "artist", "label");
  const sp = await searchParams;
  const doc = (await getAdminDb().collection("users").doc(user.uid).get()).data() ?? {};
  const billing = (doc.billing ?? null) as BillingInfo | null;
  const { plan, chosen, paid } = effectivePlan({ role: user.role, ...doc });
  const unpaidChoice = !paid && chosen.id !== plan.id;

  return (
    <DashboardShell title="Plan & billing" nav={[{ href: "/dashboard/billing", label: "Billing" }]}>
      <div className="space-y-6">
        {sp.checkout === "success" && (
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            Payment received — thanks! Your plan updates within a few seconds (refresh if it hasn&apos;t yet).
          </p>
        )}
        {sp.changed && (
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">Plan changed. Any difference is prorated on your next invoice.</p>
        )}
        {sp.checkout === "cancelled" && (
          <p className="rounded-md bg-paper-dark p-3 text-sm text-ink-soft">Checkout cancelled — nothing was charged.</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Your plan</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <p className="text-2xl font-black text-ink">
              {plan.name}{" "}
              <span className="text-base font-semibold text-ink-soft">
                {plan.price > 0 ? `${formatPlanPrice(plan)}/mo` : plan.price === 0 ? "Free" : "Custom"}
              </span>
            </p>
            {doc.planComped && <p className="text-ink-soft">Complimentary plan — no payment needed.</p>}
            {unpaidChoice && (
              <p className="rounded-md bg-brand-500/10 p-3 text-brand-700">
                You picked <b>{chosen.name}</b> at signup but haven&apos;t paid yet, so you&apos;re on Free limits. Choose it below
                to activate it.
              </p>
            )}
            {billing?.status === "past_due" && (
              <p className="rounded-md bg-red-50 p-3 text-red-700">Your last payment failed — update your card to keep your plan.</p>
            )}
            {billing?.subscriptionId && billing.status !== "canceled" && (
              <p className="text-ink-soft">
                {billing.interval === "yearly" ? "Billed yearly" : "Billed monthly"}
                {billing.storageAddons ? ` · +${billing.storageAddons * 10} GB storage` : ""}
                {billing.currentPeriodEnd &&
                  (billing.cancelAtPeriodEnd
                    ? ` · ends ${day(billing.currentPeriodEnd)}`
                    : ` · renews ${day(billing.currentPeriodEnd)}`)}
              </p>
            )}
            {billing?.customerId && <ManageBilling />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{billing?.subscriptionId && paid ? "Change plan" : "Upgrade"}</CardTitle>
          </CardHeader>
          <CardBody>
            <PricingPlans currentPlanId={paid ? plan.id : "artist-free"} role={user.role} />
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}
