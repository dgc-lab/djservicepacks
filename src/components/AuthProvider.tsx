"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  type User as FbUser,
  getIdToken,
} from "firebase/auth";
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase";
import type { Role } from "@/lib/types";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role | null;
  emailVerified: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  /** Fresh ID token (used to mint the session cookie server-side). */
  idToken: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Resolve config once. When unconfigured we have no session to wait on, so we
  // start already initialized (loading=false) and skip the auth subscription.
  const configured = useMemo(() => isFirebaseConfigured(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(configured); // true while we wait for auth
  const [initialized, setInitialized] = useState(!configured);

  useEffect(() => {
    if (!configured) return; // leave initial state (initialized=true, loading=false)

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (fb: FbUser | null) => {
      if (!fb) {
        setUser(null);
        setIdToken(null);
        setLoading(false);
        setInitialized(true);
        return;
      }
      const token = await getIdToken(fb, true);
      setIdToken(token);
      // Mint the server session cookie (+ refresh role) without blocking UI.
      void fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      });
      const claimsRes = await fetch(`/api/auth/claims?uid=${fb.uid}`).catch(
        () => null
      );
      let role: Role | null = null;
      if (claimsRes && claimsRes.ok) {
        const data = (await claimsRes.json()) as { role?: Role };
        role = data.role ?? null;
      }
      setUser({
        uid: fb.uid,
        email: fb.email,
        displayName: fb.displayName,
        role,
        emailVerified: fb.emailVerified,
      });
      setLoading(false);
      setInitialized(true);
    });

    return () => unsub();
  }, [configured]);

  const signOut = async () => {
    if (configured) {
      await getFirebaseAuth().signOut();
    }
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setIdToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, initialized, idToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}