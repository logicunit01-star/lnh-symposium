"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, ne } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { sealText } from "@/lib/secret-box";
import { MAIL_LABEL, accountTransport, clearMailCache, fromHeader, type MailAccount } from "@/lib/mail-config";
import { emailLayout } from "@/lib/notify";

const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const EMAIL = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/;
const HOST = /^[a-z0-9.-]+$/i;
const back = (q: Record<string, string>) => redirect(`/admin/email-settings?${new URLSearchParams(q)}`);

export async function saveMailMode(f: FormData) {
  const u = await requirePerm("mail");
  const mode = ["SEND", "LOG", "TEST"].includes(field(f, "mode")) ? field(f, "mode") : "SEND";
  const testAddress = field(f, "testAddress") || null;
  if (mode === "TEST" && (!testAddress || !EMAIL.test(testAddress))) return back({ err: "Enter the address that should receive all emails in test mode." });
  const v = { id: 1, mode, testAddress, updatedBy: u.name, updatedAt: new Date() };
  await db.insert(s.mailSettings).values(v).onConflictDoUpdate({ target: s.mailSettings.id, set: v });
  clearMailCache(); revalidatePath("/admin/email-settings");
  back({ saved: "mode" });
}

/** Add or edit a mailbox. A blank password keeps the saved one; the password is stored encrypted and never shown again. */
export async function saveMailAccount(id: string | null, f: FormData) {
  const u = await requirePerm("mail");
  const [old] = id ? await db.select().from(s.mailAccounts).where(eq(s.mailAccounts.id, id)) : [];
  if (id && !old) return back({ err: "Mailbox not found." });
  const security = ["SSL", "STARTTLS", "NONE"].includes(field(f, "security")) ? field(f, "security") : "SSL";
  const port = Number(field(f, "port")) || (security === "SSL" ? 465 : 587);
  const username = field(f, "username"), fromAddress = field(f, "fromAddress") || username, replyTo = field(f, "replyTo") || null;
  const host = field(f, "host"), label = field(f, "label") || fromAddress, fromName = field(f, "fromName") || "9th LNH Symposium";
  const pw = String(f.get("password") ?? "");
  const q = id ? { a: id } : { a: "new" };
  if (!HOST.test(host)) return back({ ...q, err: "Enter the outgoing (SMTP) server, e.g. symposium2027.lnh.edu.pk" });
  if (!username) return back({ ...q, err: "Enter the mailbox username (usually the full email address)." });
  if (!EMAIL.test(fromAddress)) return back({ ...q, err: "Enter a valid sender address." });
  if (replyTo && !EMAIL.test(replyTo)) return back({ ...q, err: "Enter a valid reply-to address, or leave it blank." });
  if (!id && !pw) return back({ ...q, err: "Enter the mailbox password." });
  const isDefault = f.get("isDefault") === "on";
  const row = {
    label: label.slice(0, 80), host, port, security, username, fromName: fromName.slice(0, 120), fromAddress, replyTo,
    isDefault, active: f.get("active") === "on", updatedBy: u.name, updatedAt: new Date(),
    ...(pw ? { secret: sealText(MAIL_LABEL, pw) } : {}),
  };
  let saved: MailAccount;
  if (old) [saved] = await db.update(s.mailAccounts).set(row).where(eq(s.mailAccounts.id, old.id)).returning();
  else [saved] = await db.insert(s.mailAccounts).values(row).returning();
  // exactly one default: this one if ticked, otherwise keep the existing default (or make this the default if there is none)
  if (isDefault) await db.update(s.mailAccounts).set({ isDefault: false }).where(ne(s.mailAccounts.id, saved.id));
  else {
    const others = await db.select({ id: s.mailAccounts.id }).from(s.mailAccounts).where(eq(s.mailAccounts.isDefault, true));
    if (!others.length) await db.update(s.mailAccounts).set({ isDefault: true }).where(eq(s.mailAccounts.id, saved.id));
  }
  console.log(`[mail] mailbox ${saved.label} ${old ? "updated" : "added"} by ${u.email}${pw ? " (password changed)" : ""}`); // no secrets logged
  clearMailCache(); revalidatePath("/admin/email-settings");
  back({ a: saved.id, saved: "account" });
}

export async function deleteMailAccount(id: string) {
  await requirePerm("mail");
  await db.update(s.emailTemplates).set({ accountId: null }).where(eq(s.emailTemplates.accountId, id)); // those notifications fall back to the default
  await db.delete(s.mailAccounts).where(eq(s.mailAccounts.id, id));
  const [d] = await db.select({ id: s.mailAccounts.id }).from(s.mailAccounts).where(eq(s.mailAccounts.isDefault, true));
  if (!d) { const [first] = await db.select({ id: s.mailAccounts.id }).from(s.mailAccounts).limit(1); if (first) await db.update(s.mailAccounts).set({ isDefault: true }).where(eq(s.mailAccounts.id, first.id)); }
  clearMailCache(); revalidatePath("/admin/email-settings");
  back({ saved: "deleted" });
}

/** Connects to the mail server, signs in and sends one test email from this mailbox (regardless of the delivery mode). */
export async function testMailAccount(id: string, f: FormData) {
  const u = await requirePerm("mail");
  const to = field(f, "testTo") || u.email;
  if (!EMAIL.test(to)) return back({ a: id, test: "fail", msg: "Enter a valid address for the test." });
  const [a] = await db.select().from(s.mailAccounts).where(eq(s.mailAccounts.id, id));
  if (!a) return back({ err: "Mailbox not found." });
  let msg = "", ok = false;
  try {
    const t = accountTransport(a);
    await t.verify();
    await t.sendMail({
      from: fromHeader(a.fromName, a.fromAddress), to, replyTo: a.replyTo || undefined,
      subject: `Test email from ${a.label}`,
      html: emailLayout("Test email", `<p>This test was sent by ${u.name} from <b>${a.fromAddress}</b> through ${a.host}:${a.port} (${a.security}).</p><p>If you can read this, the mailbox is set up correctly.</p>`),
    });
    ok = true; msg = `Sent to ${to}. Check the inbox (and the spam folder).`;
  } catch (e: any) { msg = String(e?.message || e).replace(/\s+/g, " ").slice(0, 240); }
  await db.insert(s.notificationLog).values({ channel: "EMAIL", to, sender: a.fromAddress, templateKey: "TEST", subject: `Test email from ${a.label}`, body: "(mailbox test)", status: ok ? "SENT" : "FAILED", error: ok ? null : msg }).catch(() => {});
  back({ a: id, test: ok ? "ok" : "fail", msg });
}
