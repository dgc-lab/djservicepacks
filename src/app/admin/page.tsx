"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformType, VerificationStatus } from "@/lib/types";

interface Applicant {
  uid: string;
  email: string | null;
  displayName: string;
  djProfile: {
    djName: string;
    platformType: PlatformType;
    stationCallLetters: string | null;
    venueOrUrl: string | null;
    verificationStatus: VerificationStatus;
    submittedAt: string;
  };
}

const PLATFORM_LABEL: Record<PlatformType, string> = {
  terrestrial_radio: "Terrestrial radio",
  club_venue: "Club / venue",
  digital_satellite: "Digital / satellite",
};

export default function AdminPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/pending")
      .then(async (res) => {
        if (!res.ok) throw new Error("load-failed");
        const d = (await res.json()) as { applicants: Applicant[] };
        setApplicants(d.applicants ?? []);
      })
      .catch(() => setError("Could not load the verification queue."))
      .finally(() => setLoaded(true));
  }, []);

  // 2026-09-28 12:10, optional rejection reason (included in the DJ's email) + result notice
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const decide = async (uid: string, decision: "approve" | "reject") => {
    setBusyUid(uid);
    setError(null);
    setNotice(null);
    const who = applicants.find((a) => a.uid === uid);
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, decision, reason: decision === "reject" ? reasons[uid]?.trim() || undefined : undefined }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || "Action failed");
    } else {
      setApplicants((prev) => prev.filter((a) => a.uid !== uid));
      const name = who?.djProfile.djName || who?.displayName || "DJ";
      setNotice(
        `${name} ${decision === "approve" ? "approved" : "rejected"} — ${
          d.emailed ? `email sent to ${who?.email ?? "them"}` : "no email sent (mail not configured or no address)"
        }.`
      );
    }
    setBusyUid(null);
  };

  return (
    <DashboardShell
      title="Admin — DJ verification queue"
      nav={[{ href: "/admin", label: "Pending approvals" }]}
    >
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      {!loaded ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : applicants.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-ink-soft">
            No pending DJ applications. New signups appear here for review.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {applicants.map((a) => (
            <Card key={a.uid}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{a.djProfile.djName}</CardTitle>
                  <span className="rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-700">
                    {PLATFORM_LABEL[a.djProfile.platformType]}
                  </span>
                </div>
              </CardHeader>
              <CardBody>
                <dl className="space-y-1 text-sm text-ink-soft">
                  <div className="flex gap-2">
                    <dt className="w-28 text-ink/50">Name</dt>
                    <dd>{a.displayName}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-28 text-ink/50">Email</dt>
                    <dd>{a.email}</dd>
                  </div>
                  {a.djProfile.stationCallLetters && (
                    <div className="flex gap-2">
                      <dt className="w-28 text-ink/50">Call letters</dt>
                      <dd>{a.djProfile.stationCallLetters}</dd>
                    </div>
                  )}
                  {a.djProfile.venueOrUrl && (
                    <div className="flex gap-2">
                      <dt className="w-28 text-ink/50">Venue / URL</dt>
                      <dd className="break-all">{a.djProfile.venueOrUrl}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="w-28 text-ink/50">Submitted</dt>
                    <dd>{new Date(a.djProfile.submittedAt).toLocaleString()}</dd>
                  </div>
                </dl>
                <input
                  value={reasons[a.uid] ?? ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [a.uid]: e.target.value }))}
                  placeholder="Rejection reason (optional — included in their email)"
                  className="mt-4 h-9 w-full rounded-md border border-ink/15 px-3 text-sm"
                />
                <div className="mt-3 flex gap-2">
                  <Button size="sm" isLoading={busyUid === a.uid} onClick={() => decide(a.uid, "approve")}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={busyUid === a.uid}
                    onClick={() => decide(a.uid, "reject")}
                  >
                    Reject
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}