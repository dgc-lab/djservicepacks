// Server-side Firebase Admin SDK (Node runtime only).
// Used for privileged operations: verifying session cookies, setting role
// custom claims, and admin-gated calls. Guarded so pages render without it.
import "server-only";

import { getApps, getApp, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let admin: App | null = null;
let hasConfig = false;

function configPresent() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

function safeCredentials() {
  const base64 = process.env.FIREBASE_PRIVATE_KEY;
  if (base64 && /^[A-Za-z0-9+/=]+$/.test(base64.replace(/\n/g, ""))) {
    try {
      return JSON.parse(Buffer.from(base64, "base64").toString("utf8"))
        .private_key;
    } catch {
      /* fall through to raw value */
    }
  }
  return process.env.FIREBASE_PRIVATE_KEY;
}

export function getAdminApp(): App {
  if (!hasConfig) {
    hasConfig = configPresent();
    if (!hasConfig) {
      throw new Error(
        "Firebase Admin not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY."
      );
    }
  }
  if (!admin) {
    // Turbopack dev compiles API routes and Server Component pages into
    // separate module graphs, each with its own copy of this module-level
    // `admin` variable. Check the SDK's own global app registry first so the
    // second bundle to run reuses the already-initialized app instead of
    // throwing "Firebase app named [DEFAULT] already exists".
    const existing = getApps();
    admin =
      existing.length > 0
        ? getApp()
        : initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: safeCredentials(),
            }),
          });
  }
  return admin;
}

export function isAdminConfigured(): boolean {
  return configPresent();
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/** Convenience guard: raise if the firebase-admin apps were never initialized. */
export function hasAdminApps(): boolean {
  return getApps().length > 0;
}