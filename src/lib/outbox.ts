import "server-only";
import nodemailer from "nodemailer";
import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "./db";
import type { OutboxPayload } from "./db/schema";
import { accountTransport, pickAccount } from "./mail-config";
import { notifyConfig, workerMode } from "./notify-config";
import { xnotifySend } from "./xnotify";

/**
 * Outbox (14.11.2026 Part C). Every email and xNotify message (WhatsApp / SMS) is first written to notification_log with status QUEUED and
 * everything needed to deliver it (payload). Then:
 * - LNH server (NOTIFIER=worker): the separate "lnh-notifier" process (scripts/notifier.ts, PM2) sends the queue, with
 *   sending limits per minute and retries. The website never waits for a mail or WhatsApp server.
 * - Vercel / local: the website sends the message at once, as before; a failed one stays queued and the scheduled
 *   jobs (/api/cron/emails, /api/cron/reminders, /api/cron/notify) retry it.
 * Retries: after 1, 5, 15, 60, 180, 360 minutes, up to "max attempts" (Admin → WhatsApp & SMS); then FAILED.
 */
export type Row = typeof s.notificationLog.$inferSelect;
const BACKOFF_MIN = [1, 5, 15, 60, 180, 360];

let envTransport: nodemailer.Transporter | null = null;
/** Fallback when no mailbox is set up in Admin → Email settings: SMTP_* in the server settings file. */
export function envMailTransport() {
  if (!process.env.SMTP_HOST) return null;
  envTransport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return envTransport;
}

/** Queues a message; outside worker mode also sends it at once. Returns the status: SENT | QUEUED (will be retried / sent by the worker) | FAILED. */
export async function enqueue(v: { channel: "EMAIL" | "WHATSAPP" | "SMS"; to: string; cc?: string | null; sender?: string | null; templateKey?: string | null; ref?: string | null; subject?: string | null; body: string; payload: OutboxPayload; priority?: number; defer?: boolean }) {
  // defer: always queue (bulk sends); outside worker mode the sender page drains the queue in steps (audit 16 Nov 2026)
  const queued = workerMode() || !!v.defer;
  const [row] = await db.insert(s.notificationLog).values({
    channel: v.channel, to: v.to, cc: v.cc ?? null, sender: v.sender ?? null, templateKey: v.templateKey ?? null, ref: v.ref ?? null,
    subject: v.subject ?? null, body: v.body.slice(0, 20000), status: queued ? "QUEUED" : "SENDING", lockedAt: queued ? null : new Date(),
    payload: v.payload, priority: v.priority ?? 0,
  }).returning();
  if (queued) return "QUEUED";
  return finish(row, await deliver(row));
}

/** Records a message that is not sent (Log only mode, or no provider set up). */
export async function logOnly(v: { channel: string; to: string; cc?: string | null; sender?: string | null; templateKey?: string | null; ref?: string | null; subject?: string | null; body: string; error?: string }) {
  await db.insert(s.notificationLog).values({ ...v, body: v.body.slice(0, 20000), status: "LOGGED" }).catch(() => {});
  return "LOGGED";
}

type Result = { ok: true; ref?: string | null } | { ok: false; error: string };
async function deliver(row: Row): Promise<Result> {
  const p = row.payload ?? {};
  try {
    if (row.channel === "EMAIL") {
      const account = await pickAccount(p.accountId);
      const t = account ? accountTransport(account) : envMailTransport();
      if (!t) return { ok: false, error: "No mailbox is set up (Admin → Email settings)." };
      const info = await t.sendMail({
        from: p.from, to: row.to, cc: row.cc || undefined, replyTo: p.replyTo || undefined, subject: p.subject ?? row.subject ?? "", html: p.html ?? row.body,
        attachments: (p.attachments ?? []).map((a) => ({ filename: a.filename, content: Buffer.from(a.content, "base64"), contentType: a.contentType, ...(a.cid ? { cid: a.cid, contentDisposition: "inline" as const } : {}) })),
      });
      return { ok: true, ref: info?.messageId ?? null };
    }
    // WhatsApp / SMS: one xNotify call; xNotify decides WhatsApp or SMS (16 Nov 2026)
    if (!p.templateId) return { ok: false, error: "No xNotify template for this message." };
    const cfg = await notifyConfig();
    if (!cfg.waEnabled) return { ok: false, error: "xNotify is switched off (Admin → WhatsApp & SMS)." };
    const r = await xnotifySend(cfg, { to: row.to, email: p.email, templateId: p.templateId, mediaUrl: p.mediaUrl });
    return { ok: true, ref: r.ref };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e).slice(0, 500) };
  }
}

async function finish(row: Row, r: Result) {
  if (r.ok) {
    // keep only the preview: drop the full HTML and attachments once delivered
    await db.update(s.notificationLog).set({ status: "SENT", sentAt: new Date(), lockedAt: null, attempts: row.attempts + 1, error: null, providerRef: r.ref ?? null, payload: null }).where(eq(s.notificationLog.id, row.id));
    return "SENT";
  }
  const attempts = row.attempts + 1, max = (await notifyConfig()).maxAttempts;
  const giveUp = attempts >= max;
  await db.update(s.notificationLog).set({
    status: giveUp ? "FAILED" : "QUEUED", attempts, error: r.error, lockedAt: null,
    nextAttemptAt: giveUp ? null : new Date(Date.now() + BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)] * 60_000),
  }).where(eq(s.notificationLog.id, row.id));
  return giveUp ? "FAILED" : "QUEUED";
}

/** Sending limits per minute and channel (email / WhatsApp+SMS), used by the worker. */
export function rateLimiter() {
  const sent: Record<string, number[]> = {};
  return {
    async wait(channel: string) {
      const cfg = await notifyConfig();
      const k = channel === "EMAIL" ? "EMAIL" : "MSG", limit = Math.max(1, channel === "EMAIL" ? cfg.emailPerMin : cfg.msgPerMin);
      const list = (sent[k] ??= []);
      for (;;) {
        const now = Date.now();
        while (list.length && now - list[0] > 60_000) list.shift();
        if (list.length < limit) { list.push(now); return; }
        await new Promise((res) => setTimeout(res, Math.min(60_000 - (now - list[0]) + 50, 5_000)));
      }
    },
  };
}

const rows = (r: any): any[] => r.rows ?? r;
/**
 * Sends due queued messages. Claims rows with FOR UPDATE SKIP LOCKED, so the worker and a scheduled job never send
 * the same message twice. A message stuck in SENDING for 10 minutes (process stopped mid-send) is queued again.
 */
export async function drainOutbox(o: { max?: number; budgetMs?: number; limiter?: ReturnType<typeof rateLimiter>; ref?: string } = {}) {
  const max = o.max ?? 50, until = Date.now() + (o.budgetMs ?? 50_000);
  await db.execute(sql`update notification_log set status = 'QUEUED', locked_at = null where status = 'SENDING' and locked_at < now() - interval '10 minutes'`);
  const out = { sent: 0, retry: 0, failed: 0 };
  while (out.sent + out.retry + out.failed < max && Date.now() < until) {
    const claimed = rows(await db.execute(sql`update notification_log set status = 'SENDING', locked_at = now()
      where id in (select id from notification_log where status = 'QUEUED' and (next_attempt_at is null or next_attempt_at <= now())${o.ref ? sql` and ref = ${o.ref}` : sql``}
                   order by priority desc, created_at limit ${o.limiter ? 1 : 5} for update skip locked)
      returning id`));
    if (!claimed.length) break;
    for (const { id } of claimed) {
      const [row] = await db.select().from(s.notificationLog).where(eq(s.notificationLog.id, id));
      if (!row) continue;
      if (o.limiter) await o.limiter.wait(row.channel);
      const st = await finish(row, await deliver(row));
      if (st === "SENT") out.sent++; else if (st === "FAILED") out.failed++; else out.retry++;
    }
  }
  return out;
}

/** Admin: send a failed or waiting message again now. */
export async function retryNow(id: string) {
  await db.update(s.notificationLog).set({ status: "QUEUED", nextAttemptAt: null, attempts: 0 })
    .where(sql`${s.notificationLog.id} = ${id} and ${s.notificationLog.status} in ('QUEUED', 'FAILED') and ${s.notificationLog.payload} is not null`);
  if (!workerMode()) await drainOutbox({ max: 5, budgetMs: 30_000 });
}
export async function cancelMessage(id: string) {
  await db.update(s.notificationLog).set({ status: "CANCELLED", payload: null, nextAttemptAt: null })
    .where(sql`${s.notificationLog.id} = ${id} and ${s.notificationLog.status} in ('QUEUED', 'FAILED')`);
}
