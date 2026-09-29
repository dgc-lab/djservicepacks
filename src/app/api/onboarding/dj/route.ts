import { NextResponse, after } from "next/server";
import { adminNotifyEmails, sendMail } from "@/lib/mailer";
import { newSignupAdminEmail } from "@/lib/emails";
import { getAdminAuth, getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import type { PlatformType } from "@/lib/types";
import { claimInvite } from "@/lib/invites";
import { checkSignup, clientIp, discardAuthUser, type BotFields } from "@/lib/botguard";

export const runtime = "nodejs";

interface DjOnboardBody {
  idToken: string;
  displayName: string;
  djName: string;
  platformType: PlatformType;
  stationCallLetters?: string;
  venueOrUrl?: string;
  inviteToken?: string;
}
type Body = DjOnboardBody & BotFields;

const PLATFORM_TYPES: PlatformType[] = [
  "terrestrial_radio",
  "club_venue",
  "digital_satellite",
];

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

  const { idToken, displayName, djName, platformType } = body;
  if (!idToken || !displayName || !djName || !platformType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!PLATFORM_TYPES.includes(platformType)) {
    return NextResponse.json({ error: "Invalid platform type" }, { status: 400 });
  }

  // Terrestrial radio requires call letters + link/address; others require a venue or URL.
  if (platformType === "terrestrial_radio" && !body.stationCallLetters) {
    return NextResponse.json({ error: "Station call letters are required" }, { status: 400 });
  }
  if (platformType !== "terrestrial_radio" && !body.venueOrUrl) {
    return NextResponse.json({ error: "Venue / URL is required" }, { status: 400 });
  }

  try {
    const auth = getAdminAuth();
    // Verify the id token maps to a real Firebase user.
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

    // 2026-09-28 18:40, a pre-approved invite skips the approval queue
    let preApproved = false;
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(userRef);
      if (existing.exists) {
        throw new Error("USER_EXISTS");
      }
      if (body.inviteToken) {
        preApproved = (await claimInvite(tx, body.inviteToken, decoded.email, "dj", uid)).preApproved;
      }
      const now = new Date().toISOString();
      tx.set(userRef, {
        uid,
        email: decoded.email ?? null,
        displayName,
        role: "dj",
        plan: null,
        djProfile: {
          djName,
          platformType,
          stationCallLetters: body.stationCallLetters ?? null,
          venueOrUrl: body.venueOrUrl ?? null,
          verificationStatus: preApproved ? "approved" : "pending",
          submittedAt: now,
          ...(preApproved ? { verifiedAt: now, verifiedVia: "invite" } : {}),
        },
        ...(body.inviteToken ? { invitedVia: body.inviteToken } : {}),
        createdAt: new Date().toISOString(),
      });
    });

    // Grant the dj role claim (proper RBAC). Verification gates high-bitrate access.
    await auth.setCustomUserClaims(uid, preApproved ? { role: "dj", djVerified: true } : { role: "dj" });

    // 2026-09-28 12:05, email the admins about the new DJ waiting for approval (after the response)
    // 2026-09-28 18:40, not for pre-approved invitees (nothing to review; Invites page shows it)
    after(() =>
      preApproved ? undefined : sendMail(
        newSignupAdminEmail(adminNotifyEmails(), {
          role: "dj",
          displayName,
          email: decoded.email ?? null,
          djName,
          platformType,
          stationCallLetters: body.stationCallLetters ?? null,
          venueOrUrl: body.venueOrUrl ?? null,
        })
      )
    );

    return NextResponse.json({ ok: true, uid, status: preApproved ? "approved" : "pending" });
  } catch (err) {
    if ((err as Error).message === "USER_EXISTS") {
      return NextResponse.json({ error: "An account already exists for this user." }, { status: 409 });
    }
    if ((err as Error).message === "INVITE_INVALID") {
      return NextResponse.json(
        { error: "This invite link is expired, already used, or for a different email." },
        { status: 400 }
      );
    }
    console.error("dj onboarding failed", err);
    return NextResponse.json({ error: "Onboarding failed" }, { status: 500 });
  }
}