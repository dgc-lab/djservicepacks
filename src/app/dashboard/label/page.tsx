import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LabelDashboardPage() {
  // 2026-09-27 01:05, redirect (not 500) when logged out / session expired
  await requirePageRole("/dashboard/label", "label");

  return (
    <DashboardShell
      title="Label Dashboard"
      nav={[
        { href: "/dashboard/artist", label: "Releases" },
        { href: "/releases/new", label: "New release" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Multi-artist roster</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-zinc-600">
              Publish across your roster, track aggregate play reports, and export campaign data.
            </p>
            <Button className="mt-4" variant="secondary">
              <Link href="/releases/new">New release</Link>
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Aggregate analytics</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-zinc-600">
              Demographic heatmaps and per-station spin reports are coming in the next milestone.
            </p>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}