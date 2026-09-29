// 2026-09-28 18:45, admin invites: list + create/send (one or many emails at once)
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { createInvite, isInviteOpen, sendInvite } from "@/lib/invites";
import { PLANS, type Invite } from "@/lib/types";

export const runtime = "nodejs";

async function admin() {
  try {
    return { user: await requireRole("admin") };
  } catch (e) {
    const unauth = (e as Error).message === "UNAUTHORIZED";
    return { denied: NextResponse.json({ error: unauth ? "Sign in required" : "Admins only" }, { status: unauth ? 401 : 403 }) };
  }
}

export async function GET() {
  const a = await admin();
  if (a.denied) return a.denied;
  const snap = await getAdminDb().collection("invites").orderBy("createdAt", "desc").limit(300).get();
  const invites = snap.docs.map((d) => {
    const i = d.data() as Invite;
    return { ...i, expired: !isInviteOpen(i) && (i.status === "sent" || i.status === "failed") };
  });
  return NextResponse.json({ invites });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const a = await admin();
  if (a.denied) return a.denied;
  const body = (await req.json().catch(() => ({}))) as {
    emails?: string;
    role?: Invite["role"];
    planId?: string | null;
    comped?: boolean;
    preApproved?: boolean;
    note?: string;
  };
  const role = body.role;
  if (role !== "dj" && role !== "artist" && role !== "label") {
    return NextResponse.json({ error: "Pick DJ, artist or label" }, { status: 400 });
  }
  const planId = role === "dj" ? null : body.planId || null;
  if (planId && !PLANS.some((p) => p.id === planId && p.role === role)) {
    return NextResponse.json({ error: "That plan doesn't match the account type" }, { status: 400 });
  }
  const emails = [...new Set((body.emails ?? "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!emails.length) return NextResponse.json({ error: "Add at least one email" }, { status: 400 });
  if (emails.length > 50) return NextResponse.json({ error: "Max 50 invites at a time" }, { status: 400 });

  const note = body.note?.trim().slice(0, 1000) || null;
  const results: { email: string; result: "sent" | "failed" | "invalid" | "has-account" }[] = [];
  for (const email of emails) {
    if (!EMAIL_RE.test(email)) {
      results.push({ email, result: "invalid" });
      continue;
    }
    const exists = await getAdminAuth()
      .getUserByEmail(email)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      results.push({ email, result: "has-account" });
      continue;
    }
    const inv = await createInvite({
      email,
      role,
      planId,
      comped: Boolean(planId && body.comped),
      preApproved: role === "dj" && Boolean(body.preApproved),
      note,
      invitedBy: a.user.email ?? a.user.uid,
    });
    const ok = await sendInvite(inv, a.user.email ?? undefined);
    results.push({ email, result: ok ? "sent" : "failed" });
  }
  return NextResponse.json({ results });
}
