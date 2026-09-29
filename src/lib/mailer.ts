// 2026-09-28 12:00, transactional email over the Plesk mail server (SMTP).
// Fail-soft: sending never throws to the caller — a mail outage must not block an
// approval or a signup. No-op (logged) when SMTP isn't configured.
//   SMTP_HOST=server1.wingudigital.com  SMTP_PORT=465  SMTP_USER / SMTP_PASS
//   MAIL_FROM="DJ Service Packs <noreply@djservicepacks.com>"
//   ADMIN_NOTIFY_EMAILS=you@example.com,other@example.com   (new-signup alerts)
// 2026-09-28 18:55, provider-agnostic: for better deliverability point SMTP_* at Mailchimp
// Transactional (Mandrill: smtp.mandrillapp.com:587, password = Mandrill API key) or any
// other transactional SMTP service — no code change, env only.
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null = null;

function configured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport(): Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 587 uses STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export interface Mail {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

/** Send an email; returns true on success, false (and logs) on any failure. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const to = Array.isArray(mail.to) ? mail.to.filter(Boolean) : mail.to;
  if (!to || (Array.isArray(to) && !to.length)) return false;
  if (!configured()) {
    console.warn(`mailer: SMTP not configured, skipped "${mail.subject}"`);
    return false;
  }
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || `DJ Service Packs <${process.env.SMTP_USER}>`,
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: mail.replyTo,
    });
    return true;
  } catch (e) {
    console.error(`mailer: failed to send "${mail.subject}"`, e);
    return false;
  }
}

export function adminNotifyEmails(): string[] {
  return (process.env.ADMIN_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
