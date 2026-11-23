"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { sealText } from "@/lib/secret-box";
import { clearNotifyCache, notifyConfig, NOTIFY_MESSAGES, XNOTIFY_LABEL, type NotifyMessageKey } from "@/lib/notify-config";
import { cancelMessage, retryNow } from "@/lib/outbox";
import { normalisePhone, sendMessage } from "@/lib/notify";
import { appUrl } from "@/lib/utils";

/** Super Admin only: checked from the signed-in role AND the current database row. */
async function superAdmin() {
  const u = await requirePerm("messaging");
  const [me] = await db.select({ role: s.users.role, active: s.users.active }).from(s.users).where(eq(s.users.id, u.sub));
  if (!me || me.role !== "SUPER_ADMIN" || !me.active) redirect("/admin?denied=1");
  return u;
}
const back = (q: Record<string, string>) => redirect(`/admin/messaging?${new URLSearchParams(q)}`);
const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, min: number, max: number, d: number) => { const n = Number(field(f, k)); return Number.isFinite(n) && n >= min ? Math.min(max, Math.round(n)) : d; };

export async function saveMessaging(f: FormData) {
  const u = await superAdmin();
  const cur = await notifyConfig({ fresh: true });
  const apiUrl = field(f, "apiUrl") || "https://api.xnotify.ai/v2/send";
  if (!/^(https:\/\/[a-z0-9.-]+|http:\/\/(localhost|127\.0\.0\.1))(:\d+)?(\/\S*)?$/i.test(apiUrl)) return back({ err: "The API address must start with https://" });
  const key = field(f, "apiKey");
  // one xNotify template per message (an integer, e.g. 2698); xNotify sends it by WhatsApp or SMS (16 Nov 2026)
  const templates: Record<string, { wa?: string }> = {};
  for (const [k, m] of Object.entries(NOTIFY_MESSAGES)) {
    const wa = field(f, `wa_${k}`);
    if (wa && !/^\d{1,10}$/.test(wa)) return back({ err: `The template ID is a number, e.g. 2698 (${m.label}).` });
    if (wa) templates[k] = { wa };
  }
  const values = {
    waEnabled: f.get("waEnabled") === "on", smsEnabled: false, apiUrl,
    apiKey: f.get("removeKey") === "on" ? null : key ? sealText(XNOTIFY_LABEL, key) : (cur.keyUnreadable ? null : (await db.select({ k: s.notifySettings.apiKey }).from(s.notifySettings).where(eq(s.notifySettings.id, 1)))[0]?.k ?? null),
    waChannel: field(f, "waChannel").slice(0, 40), templates, // empty: xNotify Smart / Custom Routing chooses the channel
    emailPerMin: int(f, "emailPerMin", 1, 600, 60), msgPerMin: int(f, "msgPerMin", 1, 600, 30), maxAttempts: int(f, "maxAttempts", 1, 20, 6),
    updatedBy: `${u.name} (${u.email})`, updatedAt: new Date(),
  };
  if (values.waEnabled && !values.apiKey) return back({ err: "To switch xNotify on, enter the API key." });
  await db.insert(s.notifySettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: s.notifySettings.id, set: values });
  clearNotifyCache();
  console.log(`[messaging] settings changed by ${u.email}: xNotify ${values.waEnabled ? "on" : "off"}`); // no secrets logged
  revalidatePath("/admin/messaging");
  back({ saved: "1" });
}

/** Queues one message to a number the Super Admin types (with the saved template ID, without a QR image). */
export async function testMessage(f: FormData) {
  await superAdmin();
  const phone = normalisePhone(field(f, "phone")), key = field(f, "key") as NotifyMessageKey;
  if (!/^92\d{10}$/.test(phone)) return back({ test: "fail", msg: "Enter a Pakistani mobile number, e.g. 03001234567." });
  if (!(key in NOTIFY_MESSAGES)) return back({ test: "fail", msg: "Choose a message." });
  // say exactly what is missing (16 Nov 2026)
  const cfg = await notifyConfig({ fresh: true });
  if (!cfg.waEnabled) return back({ test: "fail", msg: "xNotify is switched off. Tick “Send messages through xNotify” and press Save at the bottom of the form first." });
  if (!cfg.key) return back({ test: "fail", msg: "No API key is saved. Enter it and press Save." });
  if (!cfg.templates[key]?.wa) return back({ test: "fail", msg: `No template ID is saved for “${NOTIFY_MESSAGES[key].label}”. Enter it and press Save.` });
  const before = new Date();
  // sample values for the template variables, so a template that needs them can be tested
  const sample = { participant_name: "Test Participant", workshop_title: "Test workshop", date: "14 December 2026", start_time: "09:00 AM", end_time: "01:00 PM", venue: "Skill Lab", status: "Confirmed", otp: "123456" };
  const want = NOTIFY_MESSAGES[key].vars.split(", ").map((v) => v.split(" ")[0]).filter((v) => v in sample);
  await sendMessage(key, phone, { text: `LNH Symposium: test message (${NOTIFY_MESSAGES[key].label}).`, ref: "TEST", priority: 10, secret: key === "SIGN_IN_CODE", vars: Object.fromEntries(want.map((k) => [k, sample[k as keyof typeof sample]])), mediaUrl: NOTIFY_MESSAGES[key].qr ? `${appUrl()}/brand/lnh-mark.png` : undefined });
  const rows = await db.query.notificationLog.findMany({ where: (n, { and, gte, eq }) => and(gte(n.createdAt, before), eq(n.ref, "TEST")), orderBy: (n, { desc }) => desc(n.createdAt), limit: 3 });
  if (!rows.length) return back({ test: "fail", msg: "Nothing was queued: switch xNotify on and enter a template ID for this message." });
  back({ test: rows[0].status === "FAILED" || rows[0].error ? "fail" : "ok", msg: rows.map((r) => `xNotify: ${r.status}${r.error ? ` (${r.error.slice(0, 160)})` : ""}${r.providerRef ? `, ref ${r.providerRef}` : ""}`).join(" · ") });
}

export async function retryMessage(id: string) { await superAdmin(); await retryNow(id); revalidatePath("/admin/messaging"); back({ q: "1" }); }
export async function cancelQueued(id: string) { await superAdmin(); await cancelMessage(id); revalidatePath("/admin/messaging"); back({ q: "1" }); }
