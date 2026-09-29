import { NextResponse, after } from "next/server";
import { adminNotifyEmails, sendMail } from "@/lib/mailer";
import { newSignupAdminEmail } from "@/lib/emails";
import { getAdminAuth, getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { PLANS } from "@/lib/types";
import { claimInvite } from "@/lib/invites";
import { checkSignup, clientIp, discardAuthUser, type BotFields } from "@/lib/botguard";

export const runtime = "nodejs";

interface ArtistOnboardBody {
  idToken: string;
  displayName: string;
  role: "artist" | "label";
  plan: string;
  inviteToken?: string;
}
type Body = ArtistOnboardBody & BotFields;

// 2026-09-28 16:50, derived from PLANS (added Linked tiers)
const VALID_PLANS: Record<"artist" | "label", string[]> = {
  artist: PLANS.filter((p) => p.role === "artist").map((p) => p.id),
  label: PLANS.filter((p) => p.role === "label").map((p) => p.id),
};

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Server auth not configured — set FIREBASE_* env vars." },
      { status: 500 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { idToken, displayName, role, plan } = body;
  if (!idToken || !displayName || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (role !== "artist" && role !== "label") {
    return NextResponse.json({ error: "Role must be artist or label" }, { status: 400 });
  }
  if (!plan || !VALID_PLANS[role].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan for role" }, { status: 400 });
  }

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // 2026-09-28 19:25, bot guard — a rejected signup loses the auth user it just created
    const botReason = await checkSignup(req, body);
    if (botReason) {
      console.warn(`signup blocked (${botReason}) ${decoded.email ?? uid} ip=${clientIp(req)}`);
      await discardAuthUser(uid);
      return NextResponse.json(
        { error: "We couldn't verify you're human — please try again.", code: "BOT_CHECK" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const userRef = db.collection("users").doc(uid);

    // 2026-09-28 18:40, an invite can comp its plan (no Stripe subscription needed)
    let finalPlan = plan;
    let planComped = false;
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(userRef);
      if (existing.exists) {
        throw new Error("USER_EXISTS");
      }
      if (body.inviteToken) {
        const inv = await claimInvite(tx, body.inviteToken, decoded.email, role, uid);
        if (inv.comped && inv.planId && inv.planId === plan) {
          finalPlan = inv.planId;
          planComped = true;
        }
      }
      tx.set(userRef, {
        uid,
        email: decoded.email ?? null,
        displayName,
        role,
        plan: finalPlan,
        planComped,
        ...(body.inviteToken ? { invitedVia: body.inviteToken } : {}),
        djProfile: null,
        createdAt: new Date().toISOString(),
      });
    });

    // Grant the role claim.
    await auth.setCustomUserClaims(uid, { role });

    // 2026-09-28 12:05, email the admins about the new artist/label signup (after the response)
    after(() =>
      sendMail(newSignupAdminEmail(adminNotifyEmails(), { role, displayName, email: decoded.email ?? null, plan }))
    );

    return NextResponse.json({ ok: true, uid, role, plan: finalPlan, planComped });
  } catch (err) {
    if ((err as Error).message === "USER_EXISTS") {
      return NextResponse.json({ error: "An account already exists for this user." }, { status: 409 });
    }
    if ((err as Error).message === "INVITE_INVALID") {
      return NextResponse.json(
        { error: "This invite link is expired, already used, or for a different email/account type." },
        { status: 400 }
      );
    }
    console.error("artist/label onboarding failed", err);
    return NextResponse.json({ error: "Onboarding failed" }, { status: 500 });
  }
}