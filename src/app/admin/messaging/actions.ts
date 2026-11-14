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
  const cur = await notifyConfig();
  const apiUrl = field(f, "apiUrl") || "https://api.xnotify.ai/v2/send";
  if (!/^(https:\/\/[a-z0-9.-]+|http:\/\/(localhost|127\.0\.0\.1))(:\d+)?(\/\S*)?$/i.test(apiUrl)) return back({ err: "The API address must start with https://" });
  const key = field(f, "apiKey");
  const templates: Record<string, { wa?: string; sms?: string }> = {};
  for (const k of Object.keys(NOTIFY_MESSAGES)) {
    const wa = field(f, `wa_${k}`), sms = field(f, `sms_${k}`);
    if ([wa, sms].some((v) => v && !/^[\w.-]{1,64}$/.test(v))) return back({ err: `Template IDs may contain only letters, digits, - . and _ (${k}).` });
    if (wa || sms) templates[k] = { ...(wa ? { wa } : {}), ...(sms ? { sms } : {}) };
  }
  const values = {
    waEnabled: f.get("waEnabled") === "on", smsEnabled: f.get("smsEnabled") === "on", apiUrl,
    apiKey: f.get("removeKey") === "on" ? null : key ? sealText(XNOTIFY_LABEL, key) : (cur.keyUnreadable ? null : (await db.select({ k: s.notifySettings.apiKey }).from(s.notifySettings).where(eq(s.notifySettings.id, 1)))[0]?.k ?? null),
    authId: field(f, "authId") || null, authUsername: field(f, "authUsername") || null,
    waChannel: field(f, "waChannel") || "Whatsapp", smsChannel: field(f, "smsChannel") || "SMS", templates,
    emailPerMin: int(f, "emailPerMin", 1, 600, 60), msgPerMin: int(f, "msgPerMin", 1, 600, 30), maxAttempts: int(f, "maxAttempts", 1, 20, 6),
    updatedBy: `${u.name} (${u.email})`, updatedAt: new Date(),
  };
  if ((values.waEnabled || values.smsEnabled) && (!values.apiKey || !values.authId || !values.authUsername)) return back({ err: "To switch WhatsApp or SMS on, enter the eOcean API key, account ID and username." });
  await db.insert(s.notifySettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: s.notifySettings.id, set: values });
  clearNotifyCache();
  console.log(`[messaging] settings changed by ${u.email}: WhatsApp ${values.waEnabled ? "on" : "off"}, SMS ${values.smsEnabled ? "on" : "off"}`); // no secrets logged
  revalidatePath("/admin/messaging");
  back({ saved: "1" });
}

/** Queues one message to a number the Super Admin types (with the saved template ID, without a QR image). */
export async function testMessage(f: FormData) {
  await superAdmin();
  const phone = normalisePhone(field(f, "phone")), key = field(f, "key") as NotifyMessageKey;
  if (!/^92\d{10}$/.test(phone)) return back({ test: "fail", msg: "Enter a Pakistani mobile number, e.g. 03001234567." });
  if (!(key in NOTIFY_MESSAGES)) return back({ test: "fail", msg: "Choose a message." });
  const before = new Date();
  await sendMessage(key, phone, { text: `LNH Symposium: test message (${NOTIFY_MESSAGES[key].label}).`, ref: "TEST", priority: 10 });
  const rows = await db.query.notificationLog.findMany({ where: (n, { and, gte, eq }) => and(gte(n.createdAt, before), eq(n.ref, "TEST")), orderBy: (n, { desc }) => desc(n.createdAt), limit: 3 });
  if (!rows.length) return back({ test: "fail", msg: "Nothing was queued: switch WhatsApp or SMS on and enter a template ID for this message (or set an SMS gateway)." });
  back({ test: "ok", msg: rows.map((r) => `${r.channel}: ${r.status}${r.error ? ` (${r.error.slice(0, 120)})` : ""}`).join(" · ") });
}

export async function retryMessage(id: string) { await superAdmin(); await retryNow(id); revalidatePath("/admin/messaging"); back({ q: "1" }); }
export async function cancelQueued(id: string) { await superAdmin(); await cancelMessage(id); revalidatePath("/admin/messaging"); back({ q: "1" }); }
