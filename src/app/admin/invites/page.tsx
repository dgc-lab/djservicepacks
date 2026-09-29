// 2026-09-28 18:50, admin: send invite emails (DJs, artists, labels) and track them
import { DashboardShell } from "@/components/DashboardShell";
import { requirePageRole } from "@/lib/session";
import { InvitesPanel } from "./InvitesPanel";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  await requirePageRole("/admin/invites", "admin");
  return (
    <DashboardShell title="Invites" nav={[{ href: "/admin", label: "Pending approvals" }]}>
      <InvitesPanel />
    </DashboardShell>
  );
}
