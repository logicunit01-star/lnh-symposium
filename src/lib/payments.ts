import "server-only";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "./db";
import { appUrl, randomToken } from "./utils";
import { sendRegistrationNotice } from "./registration";

export type Checkout =
  | { kind: "redirect"; url: string }
  | { kind: "form"; action: string; fields: Record<string, string> }
  | { kind: "manual"; instructions: string[] };

export const provider = () => (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();

export const BANK_DETAILS = [
  "Account title: Liaquat National Hospital Association (placeholder)",
  "Bank: [Bank name] — Branch: [Branch], Karachi",
  "Account / IBAN: PK00 XXXX 0000 0000 0000 0000",
  "Write your Registration No. in the transfer reference and email the receipt to the secretariat.",
];

const pktStamp = (d = new Date()) => {
  const p = new Date(d.getTime() + 5 * 3600_000).toISOString().replace(/\D/g, "");
  return p.slice(0, 14); // yyyyMMddHHmmss in PKT
};

/** Creates a pending payment row and returns how to take the user to the gateway. */
export async function startCheckout(registrationId: string): Promise<Checkout> {
  const reg = await db.query.registrations.findFirst({ where: eq(s.registrations.id, registrationId) });
  if (!reg) throw new Error("Registration not found");
  if (reg.paymentStatus === "PAID" || reg.paymentStatus === "WAIVED") throw new Error("Already paid");
  const prov = provider();
  if (prov === "manual") return { kind: "manual", instructions: BANK_DETAILS };

  const txnRef = `T${pktStamp()}${randomToken(3).replace(/[^A-Za-z0-9]/g, "").toUpperCase()}`.slice(0, 20);
  await db.insert(s.payments).values({ registrationId, provider: prov, amount: reg.totalFee, txnRef });

  if (prov === "jazzcash") {
    // JazzCash Hosted Checkout (v1.1). Verify field list against your merchant integration guide before going live.
    const salt = process.env.JAZZCASH_INTEGRITY_SALT || "";
    const now = new Date();
    const fields: Record<string, string> = {
      pp_Version: "1.1", pp_TxnType: "", pp_Language: "EN",
      pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID || "", pp_Password: process.env.JAZZCASH_PASSWORD || "",
      pp_TxnRefNo: txnRef, pp_Amount: String(reg.totalFee * 100), pp_TxnCurrency: "PKR",
      pp_TxnDateTime: pktStamp(now), pp_TxnExpiryDateTime: pktStamp(new Date(now.getTime() + 24 * 3600_000)),
      pp_BillReference: reg.regNo, pp_Description: `LNH Symposium registration ${reg.regNo}`,
      pp_ReturnURL: `${appUrl()}/api/payments/jazzcash/callback`,
      ppmpf_1: reg.regNo,
    };
    fields.pp_SecureHash = jazzHash(fields, salt);
    return { kind: "form", action: process.env.JAZZCASH_ENDPOINT || "", fields };
  }
  if (prov === "payfast") {
    // PayFast (Pakistan) requires a server-side token request first; plug in your merchant credentials here.
    throw new Error("PayFast is not configured yet. Set PAYMENT_PROVIDER=mock or manual, or complete lib/payments.ts.");
  }
  // mock gateway — for demos and testing
  return { kind: "redirect", url: `${appUrl()}/pay/mock?txn=${txnRef}` };
}

export function jazzHash(fields: Record<string, string>, salt: string) {
  const keys = Object.keys(fields).filter((k) => k.toLowerCase().startsWith("pp") && k !== "pp_SecureHash" && fields[k] !== "").sort();
  const str = [salt, ...keys.map((k) => fields[k])].join("&");
  return crypto.createHmac("sha256", salt).update(str).digest("hex").toUpperCase();
}

/** Idempotently settles a payment and confirms the registration. */
export async function settlePayment(txnRef: string, ok: boolean, providerRef?: string, raw?: unknown) {
  const pay = await db.query.payments.findFirst({ where: eq(s.payments.txnRef, txnRef) });
  if (!pay) throw new Error("Unknown transaction");
  if (pay.status === "PAID") return pay;
  await db.update(s.payments).set({ status: ok ? "PAID" : "FAILED", providerRef, raw: raw as any }).where(eq(s.payments.id, pay.id));
  if (ok) {
    await db.update(s.registrations).set({ paymentStatus: "PAID", paymentMethod: pay.provider, paidAt: new Date() })
      .where(and(eq(s.registrations.id, pay.registrationId)));
    await sendRegistrationNotice(pay.registrationId, "paid").catch((e) => console.error(e));
  }
  return pay;
}

/** Admin: mark a registration paid manually (bank transfer / cash at desk). */
export async function markPaidManually(registrationId: string, method: string, ref?: string) {
  const reg = await db.query.registrations.findFirst({ where: eq(s.registrations.id, registrationId) });
  if (!reg) throw new Error("Not found");
  await db.insert(s.payments).values({ registrationId, provider: method, amount: reg.totalFee, txnRef: `M${Date.now()}${randomToken(2)}`, status: "PAID", providerRef: ref || null });
  await db.update(s.registrations).set({ paymentStatus: "PAID", paymentMethod: method, paidAt: new Date() }).where(eq(s.registrations.id, registrationId));
  await sendRegistrationNotice(registrationId, "paid").catch((e) => console.error(e));
}
