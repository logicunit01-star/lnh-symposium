// One-time codes: 6 digits, 5-minute life, 5 attempts, stored as a keyed hash.
import "server-only";
import { sendTemplate } from "./email";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "./db";
import { mailState } from "./mail-config";
import { sendMessage } from "./notify";
import { notifyConfig } from "./notify-config";

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 4;

const hash = (id: string, code: string) => createHmac("sha256", (process.env.AUTH_SECRET || "dev-secret") + ":otp").update(`${id}:${code}`).digest("hex");
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

/** Demo mode: when email delivery is not configured, the code is shown on screen. Codes go by email, and by SMS when set up (23 Nov 2026). */
export const otpDemoMode = async () => process.env.OTP_DEMO === "1" || (process.env.OTP_DEMO !== "0" && !(await codeDelivery()));
/** Email delivery is configured: an active mailbox in Admin → Email settings (not "Log only") or SMTP_* in the server file. */
export const codeDelivery = async () => {
  if (process.env.SMTP_HOST) return true;
  const st = await mailState().catch(() => null);
  return !!st && st.mode !== "LOG" && st.accounts.some((a) => a.active);
};
/**
 * Codes that grant access to an existing account or its registrations (SIGNIN, RESET, LOOKUP) are shown on screen only when
 * OTP_DEMO=1 is set explicitly (private demos). Otherwise anyone could read the code for someone else's email or mobile.
 */
const showsCode = async (purpose: string) => (purpose === "SIGNUP" ? otpDemoMode() : process.env.OTP_DEMO === "1");
/** Account-access codes can be used only when a real delivery channel exists (or in an explicit demo). */
export const accessCodesAvailable = async () => process.env.OTP_DEMO === "1" || (await codeDelivery());

export const maskEmail = (e: string) => e.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + "*".repeat(Math.max(1, b.length)) + c);
export const maskPhone = (p: string) => { const d = p.replace(/\D/g, ""); return d.length > 4 ? `${"*".repeat(d.length - 4)}${d.slice(-4)}` : d; };
export const phoneDigits = (p: string) => { let d = p.replace(/\D/g, ""); if (d.startsWith("0092")) d = d.slice(2); if (d.startsWith("92")) d = "0" + d.slice(2); return d; };

/** LNH 23 Nov 2026: codes also go by SMS (xNotify template 2780) when xNotify is on and the SIGN_IN_CODE template ID is saved. */
export const smsCodesOn = async () => { const c = await notifyConfig().catch(() => null); return !!c?.waEnabled && !!c.key && !!c.templates.SIGN_IN_CODE?.wa; };

async function deliver(code: string, to: { email?: string | null; phone?: string | null }, purpose: string) {
  const what = purpose === "SIGNUP" ? "verify your account" : purpose === "SIGNIN" ? "sign in to your account" : purpose === "RESET" ? "set a new password" : "view your registrations";
  if (to.email) await sendTemplate("SIGN_IN_CODE", to.email, { code, purpose: what }, { priority: 10 });
  // body { to, message_template_id, otp }; never retried, and the log masks the code
  if (to.phone) await sendMessage("SIGN_IN_CODE", to.phone, { vars: { otp: code }, priority: 10, secret: true, ref: `OTP ${purpose}` });
}

/** "your mobile ****1234 and m***@x.com" when SMS codes are on, else the email only. */
export const sentToText = async (to: { email?: string | null; phone?: string | null }) =>
  [to.phone && (await smsCodesOn()) ? maskPhone(to.phone) : null, to.email ? maskEmail(to.email) : null].filter(Boolean).join(" and ");

export async function issueOtp(purpose: "SIGNUP" | "LOOKUP" | "SIGNIN" | "RESET", target: string, to: { email?: string | null; phone?: string | null }, payload?: unknown) {
  const code = newCode();
  const [row] = await db.insert(s.otpCodes).values({ purpose, target, codeHash: "pending", payload: payload ?? null, expiresAt: new Date(Date.now() + OTP_TTL_MS) }).returning({ id: s.otpCodes.id });
  await db.update(s.otpCodes).set({ codeHash: hash(row.id, code) }).where(eq(s.otpCodes.id, row.id));
  await deliver(code, to, purpose);
  return { id: row.id, demoCode: (await showsCode(purpose)) ? code : undefined };
}

export async function resendOtp(id: string, to: { email?: string | null; phone?: string | null }) {
  const [row] = await db.select().from(s.otpCodes).where(and(eq(s.otpCodes.id, id), isNull(s.otpCodes.consumedAt)));
  if (!row) return { error: "This code request has ended. Start again." };
  if (row.sends >= OTP_MAX_SENDS) return { error: "Too many codes sent. Start again in a few minutes." };
  if (Date.now() - row.createdAt.getTime() < 30_000 && row.sends === 1) return { error: "Please wait 30 seconds before asking for a new code." };
  const code = newCode();
  await db.update(s.otpCodes).set({ codeHash: hash(row.id, code), attempts: 0, sends: row.sends + 1, expiresAt: new Date(Date.now() + OTP_TTL_MS) }).where(eq(s.otpCodes.id, id));
  await deliver(code, to, row.purpose);
  return { demoCode: (await showsCode(row.purpose)) ? code : undefined };
}

/** Checks a code; on success marks it used and returns the row (with its payload). */
export async function verifyOtp(id: string, purpose: string, code: string) {
  const [row] = await db.select().from(s.otpCodes).where(and(eq(s.otpCodes.id, id), eq(s.otpCodes.purpose, purpose)));
  if (!row || row.consumedAt) return { error: "This code has already been used or the request has ended. Start again." };
  if (row.expiresAt.getTime() < Date.now()) return { error: "The code has expired. Ask for a new one." };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { error: "Too many wrong codes. Ask for a new one." };
  const a = Buffer.from(hash(row.id, String(code).trim())), b = Buffer.from(row.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db.update(s.otpCodes).set({ attempts: row.attempts + 1 }).where(eq(s.otpCodes.id, id));
    const left = OTP_MAX_ATTEMPTS - row.attempts - 1;
    return { error: left > 0 ? `That code is not right. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong codes. Ask for a new one." };
  }
  await db.update(s.otpCodes).set({ consumedAt: new Date(), payload: null }).where(eq(s.otpCodes.id, id)); // drop pending data once used
  return { row };
}
