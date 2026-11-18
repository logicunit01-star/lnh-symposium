import "server-only";
import { and, asc, eq, lte } from "drizzle-orm";
import { db, schema as s } from "./db";
import { eventDaysLabel, getEvent } from "./event";
import { sendEmail, emailLayout } from "./notify";
import { pickAccount } from "./mail-config";
import { appUrl, fmtDateTime } from "./utils";
import { DEFAULT_TEMPLATES, SC_KEYS, TEMPLATE_KEYS, bodyToHtml, type MergeVars, type TemplateKey } from "./email-templates";

export type Template = { key: TemplateKey; subject: string; body: string; buttonLabel: string | null; enabled: boolean; custom: boolean; updatedBy: string | null; updatedAt: Date | null;
  accountId: string | null; fromName: string | null; cc: string | null; replyTo: string | null };

/** Template text: the admin's saved version, or the default. */
export async function getTemplate(key: TemplateKey): Promise<Template> {
  const [row] = await db.select().from(s.emailTemplates).where(eq(s.emailTemplates.key, key));
  const d = DEFAULT_TEMPLATES[key];
  return row
    // rows made by the mailbox setup only assign the mailbox: their text follows the current default (16 Nov 2026)
    ? row.updatedBy?.startsWith("Setup (") ? { key, subject: d.subject, body: d.body, buttonLabel: d.buttonLabel ?? null, enabled: d.locked ? true : row.enabled, custom: false, updatedBy: null, updatedAt: null, accountId: row.accountId, fromName: row.fromName, cc: row.cc, replyTo: row.replyTo }
    : { key, subject: row.subject, body: row.body, buttonLabel: row.buttonLabel, enabled: d.locked ? true : row.enabled, custom: row.subject !== d.subject || row.body !== d.body || (row.buttonLabel ?? null) !== (d.buttonLabel ?? null), updatedBy: row.updatedBy, updatedAt: row.updatedAt, accountId: row.accountId, fromName: row.fromName, cc: row.cc, replyTo: row.replyTo }
    : { key, subject: d.subject, body: d.body, buttonLabel: d.buttonLabel ?? null, enabled: true, custom: false, updatedBy: null, updatedAt: null, accountId: null, fromName: null, cc: null, replyTo: null };
}
export async function allTemplates() { return Promise.all(TEMPLATE_KEYS.map(getTemplate)); }

const subjectFill = (t: string, v: MergeVars) => t.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k) => (v[k] ?? "").toString()).replace(/\s+·\s*$/, "").trim();

export function renderTemplate(t: Pick<Template, "subject" | "body" | "buttonLabel">, vars: MergeVars) {
  const subject = subjectFill(t.subject, vars);
  const html = emailLayout(subject, bodyToHtml(t.body, vars), t.buttonLabel && vars.link ? { label: t.buttonLabel, href: String(vars.link) } : undefined,
    { name: vars.event_name ? String(vars.event_name) : null, dates: vars.event_dates ? String(vars.event_dates) : null, theme: vars.event_theme ? String(vars.event_theme) : null });
  return { subject, html };
}

/**
 * Sender settings of a notification (Admin → Automated emails → sender): mailbox, sender name, CC, reply-to.
 * Not set on the template: the Scientific Committee templates keep the sender name and CC from Event Settings; others use the
 * default mailbox's name. Reply-to falls back to the mailbox's reply-to, then the symposium contact email.
 */
const REPLY_TO_SC: TemplateKey[] = ["ABSTRACT_ACCEPTED", "ABSTRACT_ACCEPTED_POSTER", "ABSTRACT_REJECTED"];
export async function senderFor(key: TemplateKey, t?: Template) {
  const ev = await getEvent();
  const tpl = t ?? (await getTemplate(key));
  const sc = SC_KEYS.includes(key);
  return {
    accountId: tpl.accountId,
    fromName: tpl.fromName || (sc && ev.emailFrom ? ev.emailFrom.split("<")[0].trim() : null),
    from: sc ? ev.emailFrom : null,
    cc: tpl.cc ?? (sc ? ev.emailCc : null),
    // abstract outcome emails: replies go to the Scientific Committee (Waqas, 16 Nov 2026)
    replyTo: tpl.replyTo || (REPLY_TO_SC.includes(key) ? ev.scEmail || null : null),
    fallbackReplyTo: ev.contactEmail,
  };
}

/** Send a notification with its template and sender settings, recorded in the sent log. Returns DISABLED when an optional notification is switched off. */
export async function sendTemplate(key: TemplateKey, to: string, vars: MergeVars, opts: { ref?: string | null; noCc?: boolean; replyTo?: string | null; priority?: number; attachments?: { filename: string; content: Buffer | Uint8Array; contentType?: string; cid?: string }[] } = {}) {
  const ev = await getEvent();
  const t = await getTemplate(key);
  if (!t.enabled && DEFAULT_TEMPLATES[key].switchable) return "DISABLED";
  const snd = await senderFor(key, t);
  // {{reply_email}}: where a reply to this email goes (same order as the Reply-To header in sendEmail)
  const acc = await pickAccount(snd.accountId).catch(() => null);
  const reply_email = opts.replyTo || snd.replyTo || acc?.replyTo || acc?.fromAddress || ev.contactEmail;
  const { subject, html } = renderTemplate(t, { event_name: ev.name, event_dates: eventDaysLabel(ev), event_theme: "Shaping the New Era of Healthcare", contact_email: ev.contactEmail, reply_email, ...vars });
  return sendEmail(to, subject, html, opts.attachments ?? [], {
    from: snd.from, fromName: snd.fromName, accountId: snd.accountId, cc: opts.noCc ? null : snd.cc,
    replyTo: opts.replyTo || snd.replyTo, fallbackReplyTo: snd.fallbackReplyTo, templateKey: key, ref: opts.ref ?? null, priority: opts.priority,
  });
}

// ---------------- scheduled dispatches ----------------
export const JOB_KINDS: Record<string, { label: string; detail: string }> = {
  ABSTRACT_DECISIONS: { label: "Abstract decisions", detail: "Accepted / rejected emails to presenting authors not yet notified (templates: Abstract accepted, Abstract not accepted)" },
  INVITATIONS: { label: "Invitations", detail: "Chairs, co-chairs, moderators, panelists, speakers, oral presenters and accepted posters of approved, scheduled sessions not yet invited" },
  INVITE_REMINDERS: { label: "Invitation reminders", detail: "Invitees who have not answered for 3 days or more" },
};

export async function runJob(id: string, actor: string) {
  const [job] = await db.update(s.emailJobs).set({ status: "RUNNING" }).where(and(eq(s.emailJobs.id, id), eq(s.emailJobs.status, "SCHEDULED"))).returning();
  if (!job) return null;
  try {
    let result = "";
    if (job.kind === "ABSTRACT_DECISIONS") {
      const { sendDecisionEmails } = await import("./abstracts");
      result = `${await sendDecisionEmails(actor)} decision email(s) sent`;
    } else if (job.kind === "INVITATIONS") {
      const { sendInvites } = await import("./invitations");
      const r = await sendInvites();
      result = `${r.sent} invitation(s) sent, ${r.failed} failed`;
    } else if (job.kind === "INVITE_REMINDERS") {
      const { sendReminders } = await import("./invitations");
      result = `${await sendReminders(3)} reminder(s) sent`;
    } else throw new Error(`Unknown dispatch ${job.kind}`);
    await db.update(s.emailJobs).set({ status: "DONE", ranAt: new Date(), result: `${result} · run by ${actor}` }).where(eq(s.emailJobs.id, id));
    return result;
  } catch (e: any) {
    await db.update(s.emailJobs).set({ status: "FAILED", ranAt: new Date(), result: String(e?.message || e) }).where(eq(s.emailJobs.id, id));
    return null;
  }
}

/** Run every scheduled dispatch whose time has come (called by the cron route and when the admin opens the Emails page). */
export async function runDueJobs(actor = "Scheduler") {
  const due = await db.select().from(s.emailJobs).where(and(eq(s.emailJobs.status, "SCHEDULED"), lte(s.emailJobs.runAt, new Date()))).orderBy(asc(s.emailJobs.runAt));
  const out: string[] = [];
  for (const j of due) { const r = await runJob(j.id, actor); if (r) out.push(`${JOB_KINDS[j.kind]?.label ?? j.kind}: ${r}`); }
  return out;
}

/** Default schedule from the SC feedback: decisions and invitations on 31 December, after the agenda is finalised. */
export async function ensureDefaultJobs() {
  const any = await db.select({ id: s.emailJobs.id }).from(s.emailJobs).limit(1);
  if (any.length) return;
  const runAt = new Date("2026-12-31T10:00:00+05:00");
  await db.insert(s.emailJobs).values([
    { kind: "ABSTRACT_DECISIONS", runAt, createdBy: "Default schedule (SC feedback)", note: "After finalisation of the agenda" },
    { kind: "INVITATIONS", runAt: new Date(runAt.getTime() + 30 * 60e3), createdBy: "Default schedule (SC feedback)", note: "After finalisation of the agenda" },
  ]);
}

export const portalLink = (path: string) => `${appUrl()}${path}`;
export const when = (d: Date | null | undefined) => (d ? fmtDateTime(d) : "");
