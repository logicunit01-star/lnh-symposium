"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { runJob, JOB_KINDS } from "@/lib/email";
import { TEMPLATE_KEYS, DEFAULT_TEMPLATES, type TemplateKey } from "@/lib/email-templates";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function saveTemplate(key: string, f: FormData) {
  const u = await requirePerm("emails");
  if (!TEMPLATE_KEYS.includes(key as TemplateKey)) throw new Error("Unknown template");
  if (f.get("reset") === "1") await db.delete(s.emailTemplates).where(eq(s.emailTemplates.key, key));
  else {
    const row = { key, subject: str(f, "subject").slice(0, 300) || DEFAULT_TEMPLATES[key as TemplateKey].subject, body: str(f, "body").slice(0, 8000) || DEFAULT_TEMPLATES[key as TemplateKey].body, buttonLabel: str(f, "buttonLabel").slice(0, 60) || null, enabled: DEFAULT_TEMPLATES[key as TemplateKey].switchable ? f.get("enabled") === "on" : true, updatedBy: u.name, updatedAt: new Date() };
    await db.insert(s.emailTemplates).values(row).onConflictDoUpdate({ target: s.emailTemplates.key, set: row });
  }
  revalidatePath("/admin/emails");
  redirect(`/admin/emails?t=${key}&saved=1`);
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
