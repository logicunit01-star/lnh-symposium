"use server";
import { eventDaysLabel } from "@/lib/event";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { runJob, JOB_KINDS } from "@/lib/email";
import { TEMPLATE_KEYS, DEFAULT_TEMPLATES, SAMPLE_VARS, type TemplateKey } from "@/lib/email-templates";
import { can } from "@/lib/permissions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function saveTemplate(key: string, f: FormData) {
  const u = await requirePerm("emails");
  if (!TEMPLATE_KEYS.includes(key as TemplateKey)) throw new Error("Unknown template");
  const def = DEFAULT_TEMPLATES[key as TemplateKey];
  const [old] = await db.select().from(s.emailTemplates).where(eq(s.emailTemplates.key, key));
  // sender settings (mailbox, sender name, CC, reply-to): only Super Admin / Admin ("mail"); others keep what is saved
  const mail = can(u, "mail");
  const EMAILS = /^([^@\s,;]+@[^@\s,;]+\.[^@\s,;]+)(\s*,\s*[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+)*$/;
  const cc = str(f, "cc"), replyTo = str(f, "replyTo");
  if (mail && cc && !EMAILS.test(cc)) redirect(`/admin/emails?t=${key}&err=cc`);
  if (mail && replyTo && !EMAILS.test(replyTo)) redirect(`/admin/emails?t=${key}&err=reply`);
  const sender = mail
    ? { accountId: str(f, "accountId") || null, fromName: str(f, "fromName").slice(0, 120) || null, cc: cc || null, replyTo: replyTo || null }
    : { accountId: old?.accountId ?? null, fromName: old?.fromName ?? null, cc: old?.cc ?? null, replyTo: old?.replyTo ?? null };
  const reset = f.get("reset") === "1";
  const row = {
    key, ...sender,
    subject: reset || def.composed ? def.subject : str(f, "subject").slice(0, 300) || def.subject,
    body: reset || def.composed ? def.body : str(f, "body").slice(0, 8000) || def.body,
    buttonLabel: reset ? def.buttonLabel ?? null : str(f, "buttonLabel").slice(0, 60) || null,
    enabled: def.switchable ? (reset ? true : f.get("enabled") === "on") : true,
    updatedBy: u.name, updatedAt: new Date(),
  };
  await db.insert(s.emailTemplates).values(row).onConflictDoUpdate({ target: s.emailTemplates.key, set: row });
  revalidatePath("/admin/emails");
  redirect(`/admin/emails?t=${key}&saved=1`);
}

/** Sends this notification, filled with sample values, to the signed-in staff member (uses its sender settings and the delivery mode). */
export async function testTemplate(key: string) {
  const u = await requirePerm("emails");
  if (!TEMPLATE_KEYS.includes(key as TemplateKey) || DEFAULT_TEMPLATES[key as TemplateKey].composed) redirect(`/admin/emails?t=${key}`);
  const { getTemplate, renderTemplate, senderFor } = await import("@/lib/email");
  const { getEvent } = await import("@/lib/event");
  const { sendEmail } = await import("@/lib/notify");
  const ev = await getEvent();
  const t = await getTemplate(key as TemplateKey);
  const { subject, html } = renderTemplate(t, { ...SAMPLE_VARS, event_name: ev.name, event_dates: eventDaysLabel(ev), event_theme: "Shaping the New Era of Healthcare", contact_email: ev.contactEmail });
  const snd = await senderFor(key as TemplateKey, t);
  const st = await sendEmail(u.email, `[Sample] ${subject}`, html, [], { from: snd.from, fromName: snd.fromName, accountId: snd.accountId, replyTo: snd.replyTo, fallbackReplyTo: snd.fallbackReplyTo, templateKey: key, ref: "Sample" });
  redirect(`/admin/emails?t=${key}&tested=${st}`);
}

export async function scheduleJob(f: FormData) {
  const u = await requirePerm("emails");
  const kind = str(f, "kind"), at = str(f, "runAt");
  if (!JOB_KINDS[kind] || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at)) redirect("/admin/emails?tab=schedule&err=1");
  await db.insert(s.emailJobs).values({ kind, runAt: new Date(`${at}:00+05:00`), note: str(f, "note") || null, createdBy: u.name });
  revalidatePath("/admin/emails");
  redirect("/admin/emails?tab=schedule&saved=1");
}

export async function rescheduleJob(id: string, f: FormData) {
  await requirePerm("emails");
  const at = str(f, "runAt");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at)) await db.update(s.emailJobs).set({ runAt: new Date(`${at}:00+05:00`) }).where(eq(s.emailJobs.id, id));
  revalidatePath("/admin/emails");
  redirect("/admin/emails?tab=schedule&saved=1");
}

export async function cancelJob(id: string) {
  await requirePerm("emails");
  await db.update(s.emailJobs).set({ status: "CANCELLED" }).where(eq(s.emailJobs.id, id));
  revalidatePath("/admin/emails");
}

export async function runJobNow(id: string) {
  const u = await requirePerm("emails");
  const r = await runJob(id, u.name);
  revalidatePath("/admin/emails");
  redirect(`/admin/emails?tab=schedule&ran=${encodeURIComponent(r ?? "failed")}`);
}
