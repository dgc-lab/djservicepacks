// Client-side Firebase initialization.
// Values come from .env.local — see .env.local.example.
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

/** Single shared app instance (no-op if already initialized). */
export function getApp(): FirebaseApp {
  if (!getApps().length) {
    if (!firebaseConfig.projectId) {
      // Throw only when code actually tries to use Firebase, so the app can
      // still render static marketing pages before .env.local is configured.
      throw new Error(
        "Firebase is not configured. Copy .env.local.example to .env.local and fill in your project values."
      );
    }
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.projectId);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getApp());
}