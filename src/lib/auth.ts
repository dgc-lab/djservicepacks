export const DB_NAME = "djservicepacks";
export const SESSION_COOKIE = "djsession";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

// Route groups gated by role. `any` = any authenticated user.
export const ROLE_HOME: Record<string, string> = {
  dj: "/dashboard/dj",
  artist: "/dashboard/artist",
  label: "/dashboard/label",
  admin: "/admin",
};

// 2026-09-27 02:05, dashboard menu per role (DashboardShell uses this once the role is known,
// so admins/labels see their tools on every page instead of whatever the page hard-codes).
export const NAV_BY_ROLE: Record<string, { href: string; label: string }[]> = {
  dj: [
    { href: "/dashboard/dj", label: "Home" },
    { href: "/releases", label: "Releases" },
  ],
  artist: [
    { href: "/dashboard/artist", label: "My releases" },
    { href: "/releases/new", label: "New release" },
    { href: "/releases", label: "Release feed" },
    { href: "/dashboard/billing", label: "Billing" }, // 2026-09-28 18:20, Stripe billing
  ],
  label: [
    { href: "/dashboard/label", label: "Dashboard" },
    { href: "/dashboard/artist", label: "My releases" },
    { href: "/releases/new", label: "New release" },
    { href: "/releases", label: "Release feed" },
    { href: "/dashboard/billing", label: "Billing" },
  ],
  admin: [
    { href: "/admin", label: "Pending approvals" },
    { href: "/admin/import", label: "Import" }, // 2026-09-28 01:15, Box pack import
    { href: "/admin/stats", label: "Stats" }, // 2026-09-28 13:15, site stats
    { href: "/admin/invites", label: "Invites" }, // 2026-09-28 18:20, invite emails
    { href: "/admin/billing", label: "Billing" }, // 2026-09-28 18:20, Stripe setup
    { href: "/dashboard/artist", label: "My releases" },
    { href: "/releases/new", label: "New release" },
    { href: "/releases", label: "Release feed" },
  ],
};

export const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/releases/upload"];

export function routeForRole(role: string | null | undefined): string {
  return (role && ROLE_HOME[role]) || "/login";
}

export function isProtectedPath(pathname: string): boolean {
  return (
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/admin") ||
    // 2026-09-27 01:25, whole /releases area is members-only (feed 401s when logged out)
    pathname === "/releases" ||
    pathname.startsWith("/releases/")
  );
}