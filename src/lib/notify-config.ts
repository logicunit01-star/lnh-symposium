import "server-only";
import { eq } from "drizzle-orm";
import { db, schema as s } from "./db";
import { openText } from "./secret-box";

/**
 * Super Admin → WhatsApp & SMS (14.11.2026, Part C): eOcean xNotify settings. xNotify sends a pre-approved message
 * template (by its ID) to a number; it takes no merge values, so each message below has its own template ID per channel.
 * Messages marked freeText need the text itself (a sign-in code, a payment link), which a fixed template cannot carry:
 * they go by SMS only through the SMS gateway in the server file (SMS_API_URL), if one is set.
 */
export const XNOTIFY_LABEL = "xnotify-api-key";
export const NOTIFY_MESSAGES = {
  REGISTRATION_CONFIRMED: { label: "Symposium registration confirmed", detail: "Sent with the participant's symposium QR code image.", qr: true },
  WORKSHOP_CONFIRMED: { label: "Workshop registration confirmed", detail: "One per workshop, with that workshop's QR code image.", qr: true },
  REGISTRATION_RECEIVED: { label: "Registration received, payment pending", detail: "After registering, before payment." },
  PAYMENT_REMINDER: { label: "Payment pending reminder", detail: "Daily reminder for unpaid registrations." },
  SYMPOSIUM_REMINDER: { label: "Symposium starts tomorrow", detail: "Day before the symposium." },
  WORKSHOP_REMINDER: { label: "Workshop reminder", detail: "Day before each workshop." },
  CERTIFICATE_READY: { label: "E-certificate ready", detail: "Symposium and workshop certificates." },
  SIGN_IN_CODE: { label: "Sign-in code", detail: "Contains the one-time code: SMS gateway only.", freeText: true },
  BROADCAST: { label: "Message to registrants (Admin → Messages)", detail: "Free text: SMS gateway only.", freeText: true },
} as const;
export type NotifyMessageKey = keyof typeof NOTIFY_MESSAGES;

export type NotifyConfig = typeof s.notifySettings.$inferSelect & { key: string | null; keyUnreadable: boolean };
let cache: { at: number; cfg: NotifyConfig } | null = null;
export const clearNotifyCache = () => { cache = null; };

export async function notifyConfig(): Promise<NotifyConfig> {
  if (cache && Date.now() - cache.at < 30_000) return cache.cfg;
  const [row] = await db.select().from(s.notifySettings).where(eq(s.notifySettings.id, 1)).catch(() => []);
  const base = row ?? {
    id: 1, waEnabled: false, smsEnabled: false, apiUrl: "https://api.xnotify.ai/v2/send", apiKey: null, authId: null, authUsername: null,
    waChannel: "Whatsapp", smsChannel: "SMS", templates: {}, emailPerMin: 60, msgPerMin: 30, maxAttempts: 6, workerSeenAt: null, updatedBy: null, updatedAt: null,
  };
  const key = openText(XNOTIFY_LABEL, base.apiKey);
  const cfg = { ...base, key: key || null, keyUnreadable: key === null };
  cache = { at: Date.now(), cfg };
  return cfg;
}

/** "Worker" mode (LNH server): the app only queues messages and the separate lnh-notifier process sends them. Otherwise (Vercel, local) the app sends each message at once and the scheduled job retries failures. */
export const workerMode = () => process.env.NOTIFIER === "worker";
