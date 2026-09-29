import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/lib/session";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { DropScripts } from "@/app/dashboard/dj/DropScripts";
import type { UserDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DjDashboardPage() {
  // 2026-09-27 01:05, redirect (not 500) when logged out / session expired
  const user = await requirePageRole("/dashboard/dj", "dj");
  const doc = await getAdminDb().collection("users").doc(user.uid).get();
  const data = doc.exists ? (doc.data() as UserDoc) : null;
  const status = data?.djProfile?.verificationStatus;

  let body;
  if (status === "pending") {
    body = (
      <Card>
        <CardHeader>
          <CardTitle>Verification pending</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-zinc-600">
            Thanks — your application is in the admin review queue. You&apos;ll get full
            high-bitrate download access the moment it&apos;s approved. Hang tight.
          </p>
        </CardBody>
      </Card>
    );
  } else if (status === "rejected") {
    body = (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-700">Application not approved</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-zinc-600">
            {data?.djProfile?.rejectionReason
              ? `Reason: ${data.djProfile.rejectionReason}`
              : "We couldn't verify your info. Contact support to appeal."}
          </p>
        </CardBody>
      </Card>
    );
  } else {
    body = (
      <>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back, {data?.djProfile?.djName ?? "DJ"} 👋</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="mb-4 text-sm text-zinc-600">
              You&apos;re verified. Browse the latest service packs and grab what you need.
            </p>
            <Button>
              <Link href="/releases">Browse releases</Link>
            </Button>
          </CardBody>
        </Card>
        <DropScripts />
      </>
    );
  }

  return (
    <DashboardShell
      title="DJ Portal"
      nav={[
        { href: "/dashboard/dj", label: "Home" },
        { href: "/releases", label: "Releases" },
      ]}
    >
      {body}
    </DashboardShell>
  );
}