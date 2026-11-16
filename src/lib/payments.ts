import "server-only";
import crypto from "node:crypto";
import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db, schema as s } from "./db";
import { appUrl, randomToken } from "./utils";
import { sendRegistrationNotice } from "./registration";
import { createOrder, orderStatus, click2PayUrl } from "./paypro";
import { paymentConfig } from "./payment-config";
import { payBy, seatsFree } from "./seat-hold";

export type Checkout =
  | { kind: "redirect"; url: string }
  | { kind: "form"; action: string; fields: Record<string, string> }
  | { kind: "manual"; instructions: string[] };

/** Active payment provider: Admin → Payments (Off = manual, Demo / Live = paypro) or PAYMENT_PROVIDER in the server file. */
export const provider = async () => (await paymentConfig()).provider;

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
  const prov = await provider();
  if (prov === "manual") return { kind: "manual", instructions: BANK_DETAILS };

  // P3 (16 Nov 2026): reuse the open PayPro order for this registration (same amount, not expired), so one person
  // cannot end up with two vouchers for the same fee
  if (prov === "paypro") {
    const [open] = await db.select().from(s.payments).where(and(eq(s.payments.registrationId, registrationId), eq(s.payments.provider, "paypro"),
      eq(s.payments.status, "PENDING"), eq(s.payments.amount, reg.totalFee), isNotNull(s.payments.providerRef))).orderBy(desc(s.payments.createdAt)).limit(1);
    const raw = (open?.raw ?? {}) as { click2Pay?: string; expiresAt?: string };
    if (open && raw.click2Pay && (!raw.expiresAt || +new Date(raw.expiresAt) > Date.now() + 10 * 60_000)) {
      const c = await checkPayPro(open.txnRef).catch(() => null);
      if (c?.paid) return { kind: "redirect", url: `${appUrl()}/register/success/${reg.accessToken}?paid=1` };
      return { kind: "redirect", url: click2PayUrl(raw.click2Pay, `${appUrl()}/api/payments/paypro/return?txn=${open.txnRef}`) };
    }
  }

  // Order number sent to the gateway. "LNHS" + yyMMddHHmmss (PKT) + random: distinct from other LNH systems that use the
  // same PayPro merchant account (e.g. Liaquat_OPD), max 20 characters.
  const txnRef = `LNHS${pktStamp().slice(2)}${randomToken(4).replace(/[^A-Za-z0-9]/g, "").toUpperCase()}`.slice(0, 20);
  await db.insert(s.payments).values({ registrationId, provider: prov, amount: reg.totalFee, txnRef });

  if (prov === "paypro") {
    // PayPro: create an order (OrderNumber = txnRef), keep its PayProId, send the customer to Click2Pay
    const name = `${reg.firstName} ${reg.lastName}`; // no title: PayPro accepts letters only (see payProName)
    // P2: the order expires when the workshop seat hold ends, so a bank/ATM voucher cannot be paid after the seats are released
    const expiresAt = await payBy(registrationId);
    try {
      const o = await createOrder({ orderNumber: txnRef, amount: reg.totalFee, name, mobile: reg.phone, email: reg.email, expiresAt });
      await db.update(s.payments).set({ providerRef: o.payProId, raw: { order: o.raw, click2Pay: o.click2Pay, expiresAt: expiresAt?.toISOString() ?? null } as any }).where(eq(s.payments.txnRef, txnRef));
      return { kind: "redirect", url: click2PayUrl(o.click2Pay, `${appUrl()}/api/payments/paypro/return?txn=${txnRef}`) };
    } catch (e) {
      await db.update(s.payments).set({ status: "FAILED", raw: { error: String((e as Error).message) } as any }).where(eq(s.payments.txnRef, txnRef));
      throw new Error("Online payment is not available right now. Please try again in a few minutes.");
    }
  }
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

/** PayPro: asks PayPro for the order status and settles it if paid. Returns null when the payment is unknown or not PayPro. */
export async function checkPayPro(txnRef: string) {
  const pay = await db.query.payments.findFirst({ where: eq(s.payments.txnRef, txnRef) });
  if (!pay || pay.provider !== "paypro" || !pay.providerRef) return null;
  if (pay.status === "PAID") return { pay, paid: true };
  const st = await orderStatus(pay.providerRef);
  // P4: confirm only when the amount PayPro reports covers the fee (a missing amount is taken as the full order amount)
  if (st.paid && st.amountPaid > 0 && st.amountPaid < pay.amount) {
    if (pay.flag !== "SHORT") await db.update(s.payments).set({ flag: "SHORT", flagNote: `PayPro reports ${st.amountPaid} paid against ${pay.amount} due. Not confirmed: collect the difference or refund.`, raw: { ...(pay.raw as object || {}), status: st.raw } as any }).where(eq(s.payments.id, pay.id));
    return { pay, paid: false, status: "SHORT" };
  }
  if (st.paid) await settlePayment(txnRef, true, pay.providerRef, { ...(pay.raw as object || {}), status: st.raw });
  return { pay, paid: st.paid, status: st.status };
}

/** Cron (daily reminders and the 15-minute email job): PayPro orders still pending from the last 10 days are checked with PayPro.
 *  This confirms bank/ATM/OTC payments even when PayPro's callback goes elsewhere (one callback URL per merchant account). */
export async function reconcilePayPro() {
  const rows = await db.select({ txnRef: s.payments.txnRef }).from(s.payments).where(and(eq(s.payments.provider, "paypro"), eq(s.payments.status, "PENDING"),
    isNotNull(s.payments.providerRef), gt(s.payments.createdAt, new Date(Date.now() - 10 * 864e5)))).orderBy(desc(s.payments.createdAt)).limit(300);
  let paid = 0, errors = 0;
  for (const r of rows) {
    try { if ((await checkPayPro(r.txnRef))?.paid) paid++; } catch { errors++; }
  }
  return { checked: rows.length, paid, errors };
}

export function jazzHash(fields: Record<string, string>, salt: string) {
  if (!salt) throw new Error("JazzCash is not configured");
  const keys = Object.keys(fields).filter((k) => k.toLowerCase().startsWith("pp") && k !== "pp_SecureHash" && fields[k] !== "").sort();
  const str = [salt, ...keys.map((k) => fields[k])].join("&");
  return crypto.createHmac("sha256", salt).update(str).digest("hex").toUpperCase();
}

/** Idempotently settles a payment and confirms the registration. */
/** expect: the provider this confirmation comes from; a payment started with another provider is refused (audit 16 Nov 2026). */
export async function settlePayment(txnRef: string, ok: boolean, providerRef?: string, raw?: unknown, expect?: string) {
  const pay = await db.query.payments.findFirst({ where: eq(s.payments.txnRef, txnRef) });
  if (!pay) throw new Error("Unknown transaction");
  if (expect && pay.provider !== expect) throw new Error("This transaction belongs to another payment method.");
  if (pay.status === "PAID") return pay;
  await db.update(s.payments).set({ status: ok ? "PAID" : "FAILED", providerRef, raw: raw as any, flag: ok ? null : pay.flag, flagNote: ok ? null : pay.flagNote }).where(eq(s.payments.id, pay.id));
  if (ok) {
    const reg = await db.query.registrations.findFirst({ where: eq(s.registrations.id, pay.registrationId), columns: { paymentStatus: true, regNo: true } });
    // P3: already settled through another payment: no second email, flag this one for refund
    if (reg?.paymentStatus === "PAID" || reg?.paymentStatus === "WAIVED") {
      await db.update(s.payments).set({ flag: "DUPLICATE", flagNote: `${reg.regNo} was already ${reg.paymentStatus === "PAID" ? "paid" : "waived"}. Refund this payment.` }).where(eq(s.payments.id, pay.id));
      return pay;
    }
    // P2: paid after the registration was cancelled (seat hold ended, or by staff): confirm only if every workshop still has a seat
    if (reg?.paymentStatus === "FAILED" || reg?.paymentStatus === "REFUNDED") {
      if (!(await seatsFree(pay.registrationId))) {
        await db.update(s.payments).set({ flag: "LATE", flagNote: `Paid after ${reg.regNo} was cancelled and a workshop is now full. Refund, or offer another workshop.` }).where(eq(s.payments.id, pay.id));
        return pay;
      }
      await db.update(s.registrations).set({ notes: sql`concat_ws(E'\n', ${s.registrations.notes}, ${`Re-opened ${new Date().toISOString().slice(0, 16)}: paid after cancellation, seats still free.`}::text)` }).where(eq(s.registrations.id, pay.registrationId));
    }
    await db.update(s.registrations).set({ paymentStatus: "PAID", paymentMethod: pay.provider, paidAt: new Date() })
      .where(and(eq(s.registrations.id, pay.registrationId)));
    await sendRegistrationNotice(pay.registrationId, "paid").catch((e) => console.error(e));
  }
  return pay;
}

/** Admin: mark a registration paid manually (bank transfer / cash at desk). */
/** by: the staff member recording it (kept with the payment). Refuses a registration that is already paid or waived. */
export async function markPaidManually(registrationId: string, method: string, ref?: string, by?: string) {
  const reg = await db.query.registrations.findFirst({ where: eq(s.registrations.id, registrationId) });
  if (!reg) throw new Error("Not found");
  if (reg.paymentStatus === "PAID" || reg.paymentStatus === "WAIVED") return;
  await db.insert(s.payments).values({ registrationId, provider: method, amount: reg.totalFee, txnRef: `M${Date.now()}${randomToken(2)}`, status: "PAID", providerRef: ref || null, raw: by ? ({ recordedBy: by } as any) : null });
  await db.update(s.registrations).set({ paymentStatus: "PAID", paymentMethod: method, paidAt: new Date() }).where(eq(s.registrations.id, registrationId));
  await sendRegistrationNotice(registrationId, "paid").catch((e) => console.error(e));
}
