import "server-only";
import { and, asc, eq, lte } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getEvent } from "./event";
import { sendEmail, emailLayout } from "./notify";
import { appUrl, fmtDateTime } from "./utils";
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS, bodyToHtml, type MergeVars, type TemplateKey } from "./email-templates";

export type Template = { key: TemplateKey; subject: string; body: string; buttonLabel: string | null; custom: boolean; updatedBy: string | null; updatedAt: Date | null };

/** Template text: the admin's saved version, or the default. */
export async function getTemplate(key: TemplateKey): Promise<Template> {
  const [row] = await db.select().from(s.emailTemplates).where(eq(s.emailTemplates.key, key));
  const d = DEFAULT_TEMPLATES[key];
  return row
    ? { key, subject: row.subject, body: row.body, buttonLabel: row.buttonLabel, custom: true, updatedBy: row.updatedBy, updatedAt: row.updatedAt }
    : { key, subject: d.subject, body: d.body, buttonLabel: d.buttonLabel ?? null, custom: false, updatedBy: null, updatedAt: null };
}
export async function allTemplates() { return Promise.all(TEMPLATE_KEYS.map(getTemplate)); }

const subjectFill = (t: string, v: MergeVars) => t.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k) => (v[k] ?? "").toString()).replace(/\s+·\s*$/, "").trim();

export function renderTemplate(t: Pick<Template, "subject" | "body" | "buttonLabel">, vars: MergeVars) {
  const subject = subjectFill(t.subject, vars);
  const html = emailLayout(subject, bodyToHtml(t.body, vars), t.buttonLabel && vars.link ? { label: t.buttonLabel, href: String(vars.link) } : undefined);
  return { subject, html };
}

/** Send a templated email from the official Scientific Committee address (with CC), recorded in the sent log. */
export async function sendTemplate(key: TemplateKey, to: string, vars: MergeVars, opts: { ref?: string | null; noCc?: boolean; attachments?: { filename: string; content: Buffer | Uint8Array; contentType?: string }[] } = {}) {
  const ev = await getEvent();
  const t = await getTemplate(key);
  const { subject, html } = renderTemplate(t, { event_name: ev.name, ...vars });
  return sendEmail(to, subject, html, opts.attachments ?? [], { from: ev.emailFrom, cc: opts.noCc ? null : ev.emailCc, replyTo: ev.contactEmail, templateKey: key, ref: opts.ref ?? null });
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
