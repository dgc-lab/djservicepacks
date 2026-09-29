// 2026-09-28 18:35, admin invites: create + email, look up by token, claim on signup.
// The invite doc id is the (unguessable) token in the link.
import "server-only";
import { randomBytes } from "node:crypto";
import type { Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendMail } from "@/lib/mailer";
import { inviteEmail } from "@/lib/emails";
import { PLANS, type Invite } from "@/lib/types";

const SITE = process.env.SITE_URL || "https://djservicepacks.com";
export const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const inviteLink = (id: string) => `${SITE}/invite/${id}`;
const col = () => getAdminDb().collection("invites");

export function isInviteOpen(i: Invite, now = Date.now()) {
  if (i.status === "accepted" || i.status === "revoked") return false;
  return now - Date.parse(i.sentAt ?? i.createdAt) < INVITE_TTL_MS;
}

/** Email an invite (first send or resend) and record the outcome on the doc. */
export async function sendInvite(inv: Invite, replyTo?: string): Promise<boolean> {
  const plan = PLANS.find((p) => p.id === inv.planId);
  const ok = await sendMail({
    ...inviteEmail(inv.email, {
      role: inv.role,
      link: inviteLink(inv.id),
      planName: plan?.name,
      comped: inv.comped,
      preApproved: inv.preApproved,
      note: inv.note,
    }),
    replyTo,
  });
  await col()
    .doc(inv.id)
    .update(
      ok
        ? { status: "sent", sentAt: new Date().toISOString(), sendCount: (inv.sendCount ?? 0) + 1 }
        : { status: "failed" }
    );
  return ok;
}

export async function createInvite(input: {
  email: string;
  role: Invite["role"];
  planId: string | null;
  comped: boolean;
  preApproved: boolean;
  note: string | null;
  invitedBy: string;
}): Promise<Invite> {
  const id = randomBytes(18).toString("base64url");
  const inv: Invite = {
    id,
    ...input,
    email: input.email.trim().toLowerCase(),
    status: "failed", // flipped to "sent" by sendInvite on success
    createdAt: new Date().toISOString(),
    sentAt: null,
    sendCount: 0,
    acceptedAt: null,
    acceptedUid: null,
  };
  await col().doc(id).set(inv);
  return inv;
}

export async function getInvite(id: string): Promise<Invite | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) return null;
  const d = await col().doc(id).get();
  return d.exists ? (d.data() as Invite) : null;
}

/**
 * Inside a signup transaction: validate the invite for this email/role and mark it accepted.
 * Returns the invite, or throws INVITE_INVALID (bad/used/expired/mismatched).
 */
export async function claimInvite(
  tx: Transaction,
  id: string,
  email: string | null | undefined,
  role: Invite["role"],
  uid: string
): Promise<Invite> {
  const ref = col().doc(id);
  const snap = await tx.get(ref);
  const inv = snap.exists ? (snap.data() as Invite) : null;
  if (!inv || !isInviteOpen(inv) || inv.role !== role || inv.email !== (email ?? "").toLowerCase()) {
    throw new Error("INVITE_INVALID");
  }
  tx.update(ref, { status: "accepted", acceptedAt: new Date().toISOString(), acceptedUid: uid });
  return inv;
}
