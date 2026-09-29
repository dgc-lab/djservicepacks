"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";
import { NAV_BY_ROLE } from "@/lib/auth";
import { WinguCredit } from "@/components/WinguCredit";
import { SponsorCredit } from "@/components/SponsorCredit";

interface NavLink {
  href: string;
  label: string;
}

export function DashboardShell({
  title,
  nav,
  children,
}: {
  title: string;
  /** Fallback links shown until the signed-in user's role is known. */
  nav: NavLink[];
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  // 2026-09-27 02:05, role-based menu once the role is known (page-supplied nav is the fallback)
  const links = (user?.role && NAV_BY_ROLE[user.role]) || nav;
  const linkClass = (href: string) =>
    `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
      pathname === href ? "bg-brand-500/15 text-brand-700" : "text-ink-soft hover:bg-paper-dark"
    }`;
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 sm:flex">
              {links.map((n) => (
                <Link key={n.href} href={n.href} className={linkClass(n.href)}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 sm:block">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Sign out
            </button>
          </div>
        </div>
        {/* 2026-09-27 02:05, phones: the menu was hidden entirely below sm; show a scrollable row */}
        <nav className="flex gap-1 overflow-x-auto border-t border-zinc-100 px-4 py-2 sm:hidden">
          {links.map((n) => (
            <Link key={n.href} href={n.href} className={linkClass(n.href)}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900">{title}</h1>
        {children}
      </main>
      {/* 2026-09-28 12:20, footer with Wingu Digital credit */}
      {/* 2026-09-28 21:35, sponsor + builder credits */}
      <footer className="flex flex-col items-center justify-center gap-3 border-t border-zinc-200 bg-white px-6 py-5 sm:flex-row sm:gap-8">
        <SponsorCredit size="sm" />
        <WinguCredit />
      </footer>
    </div>
  );
}