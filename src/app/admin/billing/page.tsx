// 2026-09-28 18:25, admin billing: Stripe setup status, plan sync, subscribers.
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/lib/session";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { SITE, isStripeConfigured, stripeMode } from "@/lib/stripe";
import { effectivePlan, type BillingInfo } from "@/lib/types";
import { SyncPlans } from "./SyncPlans";

export const dynamic = "force-dynamic";

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className={ok ? "text-green-700" : "text-ink/40"}>{ok ? "✓" : "○"}</span>
      <span>{children}</span>
    </li>
  );
}

export default async function AdminBillingPage() {
  await requirePageRole("/admin/billing", "admin");
  const configured = isStripeConfigured();
  const mode = stripeMode();
  const webhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

  const users = (await getAdminDb().collection("users").where("role", "in", ["artist", "label"]).get()).docs.map((d) => {
    const u = d.data();
    return { id: d.id, email: u.email as string, name: u.displayName as string, role: u.role, ...effectivePlan({ ...u }), billing: (u.billing ?? null) as BillingInfo | null, comped: Boolean(u.planComped) };
  });
  const paying = users.filter((u) => u.billing?.subscriptionId && u.paid && u.plan.price > 0);
  const mrr = paying.reduce((n, u) => n + (u.billing?.interval === "yearly" ? (u.plan.price * 10) / 12 : u.plan.price), 0);

  return (
    <DashboardShell title="Billing" nav={[{ href: "/admin", label: "Pending approvals" }]}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stripe setup</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 text-sm">
            <ul className="space-y-1.5">
              <Check ok={configured}>
                <code>STRIPE_SECRET_KEY</code> set{mode && <> — <b>{mode} mode</b></>}
              </Check>
              <Check ok={webhook}>
                <code>STRIPE_WEBHOOK_SECRET</code> set — endpoint <code className="break-all">{SITE}/api/billing/webhook</code> with
                events <code>checkout.session.completed</code>, <code>customer.subscription.created/updated/deleted</code>
              </Check>
              <Check ok={false}>Plans synced (press the button — safe to repeat; prices changed in code get new Stripe prices)</Check>
            </ul>
            <SyncPlans disabled={!configured} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscribers</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <p>
              <b className="text-2xl font-black tabular-nums text-ink">{paying.length}</b> paying ·{" "}
              <b className="tabular-nums">${mrr.toFixed(2)}</b> MRR · {users.filter((u) => u.comped).length} comped
            </p>
            <ul className="divide-y divide-ink/5">
              {users
                .filter((u) => u.billing?.subscriptionId || u.comped || u.chosen.price > 0)
                .map((u) => (
                  <li key={u.id} className="flex justify-between gap-3 py-2">
                    <span className="truncate">
                      {u.name} <span className="text-ink-soft">{u.email}</span>
                    </span>
                    <span className="whitespace-nowrap text-ink-soft">
                      {u.chosen.name} · {u.comped ? "comped" : u.billing?.status ?? "unpaid"}
                    </span>
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}
