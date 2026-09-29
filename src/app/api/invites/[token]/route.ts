// 2026-09-28 18:45, public: what an invite link is for (signup pages prefill from this)
import { NextResponse } from "next/server";
import { getInvite, isInviteOpen } from "@/lib/invites";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await getInvite(token);
  if (!inv || !isInviteOpen(inv)) return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
  const { email, role, planId, comped, preApproved } = inv;
  return NextResponse.json({ invite: { email, role, planId, comped, preApproved } });
}
