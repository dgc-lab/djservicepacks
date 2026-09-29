// 2026-09-28 12:00, email templates: DJ approved / rejected, new-signup admin alert.
// Inline styles only (email clients ignore stylesheets); brand colors from globals.css.
import "server-only";
import type { Mail } from "@/lib/mailer";

const SITE = process.env.SITE_URL || "https://djservicepacks.com";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(heading: string, bodyHtml: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;background:#faf9f6;font-family:Helvetica,Arial,sans-serif;color:#0f0e0b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e8e5dd;border-radius:10px">
<tr><td style="background:#14120e;padding:18px 24px;border-radius:10px 10px 0 0;color:#faf9f6;font-weight:900;letter-spacing:.04em">DJ SERVICE PACKS</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25">${heading}</h1>
<div style="font-size:15px;line-height:1.6;color:#3a382f">${bodyHtml}</div>
${cta ? `<p style="margin:26px 0 4px"><a href="${cta.href}" style="display:inline-block;background:#f0a821;color:#14120e;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:6px">${cta.label}</a></p>` : ""}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #f1eee7;font-size:12px;color:#8a877c">djservicepacks.com</td></tr>
</table></td></tr></table></body></html>`;
}

export function djApprovedEmail(to: string, name: string): Mail {
  const n = name || "there";
  return {
    to,
    subject: "You're verified on DJ Service Packs",
    text: `Hi ${n},\n\nYour DJ account has been approved. You now have full access to the latest service packs: every edit, streaming previews and downloads.\n\nSign in: ${SITE}/login?next=/releases\n\n— DJ Service Packs`,
    html: layout(
      `You're verified, ${esc(n)} 🎧`,
      `<p style="margin:0 0 12px">Your DJ account has been approved. You now have full access to the latest service packs — every edit (clean, dirty, instrumental, intros, acapellas), streaming previews and downloads.</p>`,
      { href: `${SITE}/login?next=/releases`, label: "Browse the latest packs" }
    ),
  };
}

export function djRejectedEmail(to: string, name: string, reason?: string | null): Mail {
  const n = name || "there";
  return {
    to,
    subject: "About your DJ Service Packs application",
    text: `Hi ${n},\n\nWe weren't able to verify your DJ account this time.${reason ? `\n\nReason: ${reason}` : ""}\n\nIf you think this is a mistake, just reply to this email with more details (station, venue or show links).\n\n— DJ Service Packs`,
    html: layout(
      "About your application",
      `<p style="margin:0 0 12px">Hi ${esc(n)}, we weren't able to verify your DJ account this time.</p>${
        reason ? `<p style="margin:0 0 12px;padding:12px;background:#faf9f6;border-left:3px solid #f0a821"><b>Reason:</b> ${esc(reason)}</p>` : ""
      }<p style="margin:0">If you think this is a mistake, just reply to this email with more details — station, venue or show links help.</p>`
    ),
  };
}

export interface SignupInfo {
  role: string;
  displayName: string;
  email: string | null;
  plan?: string | null;
  djName?: string;
  platformType?: string;
  stationCallLetters?: string | null;
  venueOrUrl?: string | null;
}

export function newSignupAdminEmail(to: string[], s: SignupInfo): Mail {
  const isDj = s.role === "dj";
  const rows: [string, string | null | undefined][] = [
    ["Role", s.role],
    ["Name", s.displayName],
    ["Email", s.email],
    ...(isDj
      ? ([
          ["DJ name", s.djName],
          ["Platform", s.platformType?.replace(/_/g, " ")],
          ["Station", s.stationCallLetters],
          ["Venue / URL", s.venueOrUrl],
        ] as [string, string | null | undefined][])
      : ([["Plan", s.plan]] as [string, string | null | undefined][])),
  ];
  const filled = rows.filter(([, v]) => v);
  return {
    to,
    replyTo: s.email ?? undefined,
    subject: isDj
      ? `New DJ signup waiting for approval: ${s.djName || s.displayName}`
      : `New ${s.role} signup: ${s.displayName}`,
    text: `${filled.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${isDj ? `Review: ${SITE}/admin` : ""}`,
    html: layout(
      isDj ? "New DJ waiting for approval" : `New ${esc(s.role)} signup`,
      `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${filled
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 16px 4px 0;color:#8a877c;white-space:nowrap">${esc(k)}</td><td style="padding:4px 0">${esc(String(v))}</td></tr>`
        )
        .join("")}</table>`,
      isDj ? { href: `${SITE}/login?next=/admin`, label: "Review pending approvals" } : undefined
    ),
  };
}

// 2026-09-28 18:35, admin invite
export function inviteEmail(
  to: string,
  opts: { role: "dj" | "artist" | "label"; link: string; planName?: string | null; comped?: boolean; preApproved?: boolean; note?: string | null }
): Mail {
  const who = opts.role === "dj" ? "DJ" : opts.role === "label" ? "label" : "artist";
  const perk =
    opts.role === "dj"
      ? opts.preApproved
        ? "Your DJ account will be approved the moment you sign up — straight to the latest service packs."
        : "Sign up with your station, venue or show details and we'll verify you for full access."
      : opts.comped && opts.planName
        ? `Your ${opts.planName} plan is on us — no card needed.`
        : "Upload one complete pack per release and get it into verified DJs' crates.";
  const note = opts.note?.trim();
  return {
    to,
    subject: opts.role === "dj" ? "You're invited: DJ Service Packs (verified DJ access)" : "You're invited to DJ Service Packs",
    text: `You're invited to join DJ Service Packs as ${opts.role === "artist" ? "an" : "a"} ${who}.\n\n${perk}${
      note ? `\n\n"${note}"` : ""
    }\n\nAccept your invite: ${opts.link}\n\n— DJ Service Packs`,
    html: layout(
      `You're invited to DJ Service Packs`,
      `<p style="margin:0 0 12px">You've been invited to join as ${opts.role === "artist" ? "an" : "a"} <b>${who}</b>. ${esc(perk)}</p>${
        note
          ? `<p style="margin:0 0 12px;padding:12px;background:#faf9f6;border-left:3px solid #f0a821">${esc(note).replace(/\n/g, "<br>")}</p>`
          : ""
      }<p style="margin:0;font-size:13px;color:#8a877c">The link is just for ${esc(to)} and works for 30 days.</p>`,
      { href: opts.link, label: "Accept invite" }
    ),
  };
}
