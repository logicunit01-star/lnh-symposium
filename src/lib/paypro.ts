import "server-only";
import https from "node:https";
import http from "node:http";
import crypto from "node:crypto";
import { paymentConfig } from "./payment-config";

/**
 * PayPro (Pakistan) API v2 — "PayPro Integration.docx", "API Document - Version 2 (Updated).pdf" and
 * "paypro-invoices-callback-api-v2.1-POST.pdf" (13 Nov 2026).
 *
 * Flow: auth → create order (ppro/co) with OrderNumber = our txnRef → send the customer to Click2Pay with our
 * callback_url → on return, and when PayPro calls /paypro/uis, mark the order paid. The order status API (ppro/ggos)
 * is the source of truth for the return page and for the reconcile job.
 *
 * Settings: Admin → Payments (Super Admin only; Off / Demo / Live, encrypted credentials, see lib/payment-config.ts).
 * Fallback when no mode is chosen there: PAYMENT_PROVIDER, PAYPRO_BASE_URL, PAYPRO_CLIENT_ID, PAYPRO_CLIENT_SECRET,
 * PAYPRO_MERCHANT_ID, PAYPRO_CALLBACK_USERNAME, PAYPRO_CALLBACK_PASSWORD in the server settings file.
 * PAYPRO_DUE_DAYS (optional, default 3): order due date in days.
 */
/** The active PayPro settings: Admin → Payments (Super Admin) or, if no mode is chosen there, the server settings file. */
export async function ppConfig() {
  const c = await paymentConfig();
  if (!c.paypro || !c.paypro.clientId || !c.paypro.clientSecret || !c.paypro.merchantId) throw new Error("PayPro is not configured. The Super Admin enters the credentials in Admin → Payments.");
  // the address may be entered with or without "/v2/ppro" (e.g. https://demoapi.paypro.com.pk/v2/ppro)
  return { base: c.paypro.baseUrl.replace(/\/+$/, "").replace(/\/v2\/ppro$/i, ""), clientId: c.paypro.clientId, clientSecret: c.paypro.clientSecret, merchantId: c.paypro.merchantId, dueDays: c.paypro.dueDays };
}
type Cfg = Awaited<ReturnType<typeof ppConfig>>;

type Res = { status: number; headers: http.IncomingHttpHeaders; body: string };
/** Raw HTTP call. node:https is used because PayPro's ggos is a GET with a JSON body, which fetch() refuses. */
function call(base: string, method: "GET" | "POST", path: string, body: unknown, headers: Record<string, string> = {}): Promise<Res> {
  const url = new URL(base + path);
  const data = Buffer.from(JSON.stringify(body));
  const lib = url.protocol === "http:" ? http : https;
  return new Promise((resolve, reject) => {
    // Accept and User-Agent as PayPro's own examples send them: a request without a User-Agent is stopped by the
    // Cloudflare check in front of demoapi.paypro.com.pk ("Just a moment…", HTTP 403), 16 Nov 2026
    const req = lib.request(url, { method, headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*", "User-Agent": "LNH-Symposium-Portal/1.0 (+https://symposium2027.lnh.edu.pk)", "Content-Length": String(data.length), ...headers }, timeout: 20000 }, (res) => {
      let b = ""; res.setEncoding("utf8"); res.on("data", (c) => (b += c)); res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, body: b }));
    });
    req.on("timeout", () => req.destroy(new Error("PayPro did not respond in time")));
    req.on("error", reject);
    req.end(data);
  });
}
const parse = (b: string): any => { try { return JSON.parse(b); } catch { return null; } };
/** PayPro answers with an array: [{ Status: "00" }, { ...data }]. Merges the objects with lower-cased keys. */
export function flat(j: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const o of Array.isArray(j) ? j : [j]) if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) out[k.toLowerCase()] = v;
  return out;
}

let cached: { token: string; at: number; key: string } | null = null; // the token belongs to one base URL + client ID
async function signIn(c: Pick<Cfg, "base" | "clientId" | "clientSecret">) {
  // field names as in LNH's PayPro sandbox collection (16 Nov 2026); the lower-case form of the API document is tried second
  let r: Res | null = null;
  for (const body of [{ ClientID: c.clientId, ClientSecret: c.clientSecret }, { clientid: c.clientId, clientsecret: c.clientSecret }]) {
    try { r = await call(c.base, "POST", "/v2/ppro/auth", body); }
    catch (e: any) { throw new Error(`PayPro could not be reached at ${c.base}: ${e?.code || ""} ${e?.message || e}`.trim()); }
    const t = (r.headers["token"] as string) || flat(parse(r.body)).token;
    if (r.status < 400 && t) return String(t);
  }
  const f = flat(parse(r!.body));
  if (r!.status === 403 && /just a moment|cloudflare|cf-chl|challenge/i.test(r!.body + JSON.stringify(r!.headers)))
    throw new Error(`PayPro's Cloudflare protection blocked this server (HTTP 403 "Just a moment…" check) before the credentials were checked. PayPro must allow this server's address for ${c.base}.`);
  throw new Error(`PayPro sign-in refused: HTTP ${r!.status}${f.status ? `, status ${f.status}` : ""}${f.description || f.message ? `, “${f.description || f.message}”` : r!.body && !parse(r!.body) ? `, “${r!.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120)}”` : ""} (${c.base}/v2/ppro/auth)`);
}
async function token(c: Cfg, force = false) {
  const k = `${c.base}|${c.clientId}`;
  if (!force && cached && cached.key === k && Date.now() - cached.at < 20 * 60_000) return cached.token;
  cached = { token: await signIn(c), at: Date.now(), key: k };
  return cached.token;
}
/** Calls with the token; signs in again once if the token was rejected. */
async function authed(c: Cfg, method: "GET" | "POST", path: string, body: unknown) {
  let r = await call(c.base, method, path, body, { token: await token(c) });
  if (r.status === 401 || r.status === 403) r = await call(c.base, method, path, body, { token: await token(c, true) });
  return r;
}
/** Admin → Payments "Test connection": signs in with a credential set without using or caching it. */
export async function testSignIn(c: { base: string; clientId: string; clientSecret: string }) {
  try { await signIn({ ...c, base: c.base.replace(/\/+$/, "").replace(/\/v2\/ppro$/i, "") }); return { ok: true as const }; } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

const pkDate = (d: Date) => { const p = new Date(d.getTime() + 5 * 3600_000); return `${String(p.getUTCDate()).padStart(2, "0")}/${String(p.getUTCMonth() + 1).padStart(2, "0")}/${p.getUTCFullYear()}`; };

/** expiresAt (P2, 16 Nov 2026): the order stops being payable then (the workshop seat hold); none = due in PAYPRO_DUE_DAYS, no expiry. */
export async function createOrder(o: { orderNumber: string; amount: number; name: string; mobile?: string; email?: string; expiresAt?: Date | null }) {
  const c = await ppConfig(), now = new Date();
  const secs = o.expiresAt ? Math.max(900, Math.floor((+o.expiresAt - +now) / 1000)) : 0;
  const due = o.expiresAt ? new Date(+now + secs * 1000) : new Date(+now + c.dueDays * 864e5);
  const r = await authed(c, "POST", "/v2/ppro/co", [{ MerchantId: c.merchantId }, {
    OrderNumber: o.orderNumber, OrderAmount: String(o.amount), OrderDueDate: pkDate(due), OrderType: "Service",
    IssueDate: pkDate(now), OrderExpireAfterSeconds: String(secs), CustomerName: o.name.slice(0, 100), CustomerMobile: (o.mobile || "").replace(/[^\d+]/g, ""), CustomerEmail: o.email || "", CustomerAddress: "",
  }]);
  const j = parse(r.body), f = flat(j);
  const payProId = f.payproid ?? f.payproId ?? f.cpayid, click2Pay = f.click2pay;
  if (r.status >= 400 || String(f.status ?? "00") !== "00" || !payProId || !click2Pay) throw new Error(`PayPro could not create the order: ${f.description || f.message || r.status}`);
  return { payProId: String(payProId), click2Pay: String(click2Pay), raw: j };
}

export type OrderStatus = { paid: boolean; status: string; amountPaid: number; orderNumber?: string; raw: unknown };
export async function orderStatus(payProId: string): Promise<OrderStatus> {
  const c = await ppConfig();
  const r = await authed(c, "GET", "/v2/ppro/ggos", { userName: c.merchantId, cpayId: payProId });
  const j = parse(r.body), f = flat(j);
  if (r.status >= 400 || !j) throw new Error(`PayPro order status failed (${r.status})`);
  const status = String(f.orderstatus || "").toUpperCase();
  return { paid: status === "PAID", status, amountPaid: Number(f.orderamountpaid || 0), orderNumber: f.ordernumber, raw: j };
}

/** Click2Pay link with our return address (works for card payments; bank/ATM/OTC payments arrive through /paypro/uis). */
export const click2PayUrl = (click2Pay: string, returnUrl: string) => `${click2Pay}${click2Pay.includes("?") ? "&" : "?"}callback_url=${encodeURIComponent(returnUrl)}`;

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
/** Checks the username and password PayPro sends to /paypro/uis. */
export async function callbackAuthOk(username: unknown, password: unknown) {
  const { callback } = await paymentConfig();
  const u = callback.username, p = callback.password;
  if (!u || !p || typeof username !== "string" || typeof password !== "string") return false;
  const uOk = same(username, u), pOk = same(password, p); // both always compared
  return uOk && pOk;
}
