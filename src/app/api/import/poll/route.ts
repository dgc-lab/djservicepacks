// 2026-09-28 01:10, import mailbox poller. A Plesk scheduled task ("Fetch a URL", every
// 15 min) calls GET /api/import/poll?token=IMPORT_POLL_TOKEN. Reads unseen mail in the import
// mailbox over IMAP; mail from IMPORT_ALLOWED_SENDERS is parsed for Box pack links and
// imported (as drafts for admin review unless IMPORT_AUTO_PUBLISH=true). Every message is
// marked seen and logged in the `imports` collection.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getAdminAuth, getAdminDb, isAdminConfigured } from "@/lib/firebaseAdmin";
import { planImport, publishPlans } from "@/lib/boxImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_MESSAGES_PER_RUN = 10;

function tokenOk(given: string | null) {
  const want = process.env.IMPORT_POLL_TOKEN;
  if (!want || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>/gi, " $1 ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!tokenOk(url.searchParams.get("token") ?? bearer)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { IMPORT_IMAP_HOST, IMPORT_IMAP_USER, IMPORT_IMAP_PASS, IMPORT_OWNER_EMAIL } = process.env;
  if (!IMPORT_IMAP_HOST || !IMPORT_IMAP_USER || !IMPORT_IMAP_PASS || !IMPORT_OWNER_EMAIL || !isAdminConfigured()) {
    return NextResponse.json({ error: "Import mailbox not configured" }, { status: 500 });
  }
  const allowed = (process.env.IMPORT_ALLOWED_SENDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const autoPublish = process.env.IMPORT_AUTO_PUBLISH === "true";
  const owner = await getAdminAuth().getUserByEmail(IMPORT_OWNER_EMAIL);

  const client = new ImapFlow({
    host: IMPORT_IMAP_HOST,
    port: Number(process.env.IMPORT_IMAP_PORT ?? 993),
    secure: true,
    auth: { user: IMPORT_IMAP_USER, pass: IMPORT_IMAP_PASS },
    logger: false,
  });

  const summary: { uid: number; from: string; subject: string; outcome: string }[] = [];
  let anyLive = false;
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const uids = ((await client.search({ seen: false }, { uid: true })) || []).slice(0, MAX_MESSAGES_PER_RUN);
    for (const uid of uids) {
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) continue;
      const parsed = await simpleParser(msg.source);
      const from = (parsed.from?.value?.[0]?.address ?? "").toLowerCase();
      const subject = parsed.subject ?? "(no subject)";
      let outcome: string;
      let results: unknown[] = [];

      if (!allowed.includes(from)) {
        outcome = "ignored: sender not allowed";
      } else {
        const text = [parsed.text ?? "", parsed.html ? htmlToText(parsed.html) : ""].join("\n");
        const plans = await planImport(text);
        if (!plans.length) {
          outcome = "no Box pack links found";
        } else {
          const status = autoPublish ? "live" : "draft";
          const res = await publishPlans(plans, { ownerUid: owner.uid, ownerRole: "admin", status, via: "mailbox" });
          results = res;
          const created = res.filter((r) => r.status === "created").length;
          if (created && status === "live") anyLive = true;
          outcome = `${created} ${status === "live" ? "published" : "queued for review"}, ${
            res.filter((r) => r.status === "exists").length
          } already imported, ${res.filter((r) => r.status === "error").length} failed`;
        }
      }

      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      await getAdminDb().collection("imports").add({
        via: "mailbox",
        from,
        subject,
        outcome,
        results,
        createdAt: new Date().toISOString(),
      });
      summary.push({ uid, from, subject, outcome });
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }
  if (anyLive) revalidatePath("/");
  return NextResponse.json({ processed: summary.length, messages: summary });
}
