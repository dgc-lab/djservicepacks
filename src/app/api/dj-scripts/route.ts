import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireRole } from "@/lib/session";
import { getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { buildDjLabel } from "@/lib/djLabel";
import type { DjScript, DjProfile, UserDoc } from "@/lib/types";

export const runtime = "nodejs";

/** All of the current DJ's drop scripts. */
export async function GET() {
  let user;
  try {
    user = await requireRole("dj");
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "DJs only" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ scripts: [] }, { status: 200 });
  }

  const snap = await getAdminDb()
    .collection("users")
    .doc(user.uid)
    .collection("djScripts")
    .orderBy("createdAt", "desc")
    .get();

  const scripts = snap.docs.map((d) => d.data() as DjScript);
  return NextResponse.json({ scripts });
}

/** Create a drop script on the DJ's profile. Denormalizes identity at write time. */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireRole("dj");
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "UNAUTHORIZED" ? "Sign in required" : "DJs only" },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 }
    );
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  let body: DjScript;
  try {
    body = (await req.json()) as DjScript;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.body || !body.body.trim()) {
    return NextResponse.json({ error: "Script text is required" }, { status: 400 });
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(user.uid);

  // Denormalize the DJ identity -> credited label at write time.
  const userSnap = await userRef.get();
  const userDoc = userSnap.exists ? (userSnap.data() as UserDoc) : null;
  const profile = userDoc?.djProfile as DjProfile | undefined;
  const djName = profile?.djName || userDoc?.displayName || "DJ";
  const djLabel = buildDjLabel(djName, profile);

  const now = new Date().toISOString();
  const script: DjScript = {
    scriptId: `SCR_${randomUUID().slice(0, 8).toUpperCase()}`,
    djUid: user.uid,
    djName,
    stationCallLetters: profile?.stationCallLetters ?? null,
    venueOrUrl: profile?.venueOrUrl ?? null,
    platformType: profile?.platformType ?? null,
    djLabel,
    title: body.title || null,
    public: body.public ?? true,
    body: body.body.trim(),
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("users").doc(user.uid).collection("djScripts").doc(script.scriptId).set(script);
  return NextResponse.json({ script, status: 201 });
}