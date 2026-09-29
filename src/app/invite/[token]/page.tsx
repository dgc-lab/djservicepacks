// 2026-09-28 18:50, invite link: send the invitee to the right signup form, or explain why not.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getInvite, isInviteOpen } from "@/lib/invites";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await getInvite(token);
  if (inv && isInviteOpen(inv)) {
    redirect(`/onboarding/${inv.role === "dj" ? "dj" : "artist"}?invite=${encodeURIComponent(token)}`);
  }
  const used = inv?.status === "accepted";
  return (
    <main className="flex flex-1 items-center justify-center bg-paper p-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-ink/10 bg-white p-8 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="text-xl font-black text-ink">{used ? "Invite already used" : "This invite has expired"}</h1>
        <p className="text-sm text-ink-soft">
          {used
            ? "An account was already created with this invite. Sign in to continue."
            : "Invite links work for 30 days. Ask whoever invited you to resend it."}
        </p>
        <Link href="/login" className="inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper">
          Sign in
        </Link>
      </div>
    </main>
  );
}
