import "server-only";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema as s } from "./db";

/**
 * Payment configuration. The Super Admin chooses Off / Demo / Live in Admin → Payments; PayPro credentials are stored
 * encrypted (AES-256-GCM, key derived from AUTH_SECRET) and only ever decrypted on the server. If no mode has been
 * chosen in the admin, the server settings file applies (PAYMENT_PROVIDER, PAYPRO_*), as before.
 */
export type PayProSet = { baseUrl: string; clientId: string; clientSecret: string; merchantId: string };
export type Secrets = { demo?: Partial<PayProSet>; live?: Partial<PayProSet>; callback?: { username?: string; password?: string } };
export type PaymentMode = "OFF" | "DEMO" | "LIVE";
export const DEMO_BASE = "https://demoapi.paypro.com.pk";

const key = () => crypto.createHash("sha256").update(`${process.env.AUTH_SECRET || "dev-secret-change-me-dev-secret-change-me"}:payment-settings:v1`).digest();
export function seal(obj: Secrets): string {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return `v1.${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${data.toString("base64")}`;
}
export function unseal(v: string | null | undefined): Secrets | null {
  if (!v) return {};
  try {
    const [ver, iv, tag, data] = v.split(".");
    if (ver !== "v1") return null;
    const d = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8"));
  } catch { return null; } // AUTH_SECRET changed or data damaged: the Super Admin must enter the credentials again
}

export type PaymentConfig = {
  source: "admin" | "server";
  mode: PaymentMode | null;
  provider: string; // paypro | manual | mock | jazzcash | payfast
  paypro: (PayProSet & { dueDays: number }) | null;
  callback: { username: string; password: string };
};

let cache: { at: number; v: PaymentConfig } | null = null;
export const clearPaymentConfigCache = () => { cache = null; };

export async function readPaymentRow() {
  const [row] = await db.select().from(s.paymentSettings).where(eq(s.paymentSettings.id, 1));
  return row ?? null;
}

export async function paymentConfig(): Promise<PaymentConfig> {
  if (cache && Date.now() - cache.at < 30_000) return cache.v;
  const dueDays = Number(process.env.PAYPRO_DUE_DAYS || 3);
  let v: PaymentConfig;
  const row = await readPaymentRow().catch(() => null); // table missing before migration 0017: fall back to the server file
  if (row?.mode === "OFF" || row?.mode === "DEMO" || row?.mode === "LIVE") {
    const sec = unseal(row.secrets) ?? {};
    const set = row.mode === "LIVE" ? sec.live : row.mode === "DEMO" ? sec.demo : undefined;
    const ok = set?.clientId && set.clientSecret && set.merchantId && (row.mode === "DEMO" || set.baseUrl);
    v = {
      source: "admin", mode: row.mode,
      provider: row.mode === "OFF" ? "manual" : "paypro",
      paypro: row.mode !== "OFF" && ok ? { baseUrl: (set!.baseUrl || DEMO_BASE).replace(/\/$/, ""), clientId: set!.clientId!, clientSecret: set!.clientSecret!, merchantId: set!.merchantId!, dueDays } : null,
      callback: { username: sec.callback?.username || "", password: sec.callback?.password || "" },
    };
  } else {
    const provider = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
    v = {
      source: "server", mode: null, provider,
      paypro: process.env.PAYPRO_CLIENT_ID ? { baseUrl: (process.env.PAYPRO_BASE_URL || DEMO_BASE).replace(/\/$/, ""), clientId: process.env.PAYPRO_CLIENT_ID || "", clientSecret: process.env.PAYPRO_CLIENT_SECRET || "", merchantId: process.env.PAYPRO_MERCHANT_ID || "", dueDays } : null,
      callback: { username: process.env.PAYPRO_CALLBACK_USERNAME || "", password: process.env.PAYPRO_CALLBACK_PASSWORD || "" },
    };
  }
  cache = { at: Date.now(), v };
  return v;
}

/** What the admin screen may show about a saved value: never the value itself. */
export const hint = (v?: string) => (!v ? "" : v.length <= 6 ? "saved" : `saved, ends in …${v.slice(-3)}`);
