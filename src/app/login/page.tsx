"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { routeForRole } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const { user, initialized, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in? bounce to the role home. Navigation must happen in an
  // effect, not during render — calling router.replace() inline here caused
  // "Cannot update a component while rendering a different component" and,
  // combined with handleSubmit's stale-role push below, an infinite
  // redirect loop.
  useEffect(() => {
    if (initialized && user && !loading) {
      router.replace(routeForRole(user.role));
    }
  }, [initialized, user, loading, router]);

  if (initialized && user && !loading) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      // Don't push with `user` here — it's a stale closure from before
      // sign-in resolved. The effect above redirects once AuthProvider's
      // auth-state listener populates `user` with the real role.
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo className="justify-center" />
          <p className="mt-2 text-sm text-ink-soft">Sign in to your portal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {!isFirebaseConfigured() && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                Firebase isn&apos;t configured yet. Copy <code>.env.local.example</code>{" "}
                to <code>.env.local</code> and add your project values.
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@station.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" isLoading={busy}>
                Sign in
              </Button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs text-zinc-400">
                <span className="bg-white px-2">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleGoogle}
              disabled={busy || !isFirebaseConfigured()}
            >
              Continue with Google
            </Button>
          </CardBody>
        </Card>

        <p className="mt-4 text-center text-sm text-zinc-500">
          New here?{" "}
          <Link href="/onboarding/dj" className="font-medium text-brand-700 hover:underline">
            Verify as a DJ
          </Link>{" "}
          ·{" "}
          <Link href="/onboarding/artist" className="font-medium text-brand-700 hover:underline">
            Sign up as an Artist or Label
          </Link>
        </p>
      </div>
    </main>
  );
}