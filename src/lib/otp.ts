// One-time codes: 6 digits, 5-minute life, 5 attempts, stored as a keyed hash.
import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "./db";
import { sendEmail, sendSms, emailLayout } from "./notify";

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 4;

const hash = (id: string, code: string) => createHmac("sha256", (process.env.AUTH_SECRET || "dev-secret") + ":otp").update(`${id}:${code}`).digest("hex");
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

/** Demo mode: when neither email nor SMS delivery is configured, the code is shown on screen. */
export const otpDemoMode = () => process.env.OTP_DEMO === "1" || (!process.env.SMTP_HOST && !process.env.SMS_API_URL && process.env.OTP_DEMO !== "0");

export const maskEmail = (e: string) => e.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + "*".repeat(Math.max(1, b.length)) + c);
export const maskPhone = (p: string) => { const d = p.replace(/\D/g, ""); return d.length > 4 ? `${"*".repeat(d.length - 4)}${d.slice(-4)}` : d; };
export const phoneDigits = (p: string) => { let d = p.replace(/\D/g, ""); if (d.startsWith("0092")) d = d.slice(2); if (d.startsWith("92")) d = "0" + d.slice(2); return d; };

async function deliver(code: string, to: { email?: string; phone?: string }, purpose: string) {
  const what = purpose === "SIGNUP" ? "verify your account" : "view your registrations";
  if (to.email) await sendEmail(to.email, `Your LNH Symposium code: ${code}`, emailLayout("Your one-time code", `<p>Use this code to ${what}:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>It expires in 5 minutes. If you did not ask for it, ignore this email.</p>`));
  if (to.phone) await sendSms(to.phone, `LNH Symposium: your code is ${code}. It expires in 5 minutes. Do not share it.`);
}

export async function issueOtp(purpose: "SIGNUP" | "LOOKUP", target: string, to: { email?: string; phone?: string }, payload?: unknown) {
  const code = newCode();
  const [row] = await db.insert(s.otpCodes).values({ purpose, target, codeHash: "pending", payload: payload ?? null, expiresAt: new Date(Date.now() + OTP_TTL_MS) }).returning({ id: s.otpCodes.id });
  await db.update(s.otpCodes).set({ codeHash: hash(row.id, code) }).where(eq(s.otpCodes.id, row.id));
  await deliver(code, to, purpose);
  return { id: row.id, demoCode: otpDemoMode() ? code : undefined };
}

export async function resendOtp(id: string, to: { email?: string; phone?: string }) {
  const [row] = await db.select().from(s.otpCodes).where(and(eq(s.otpCodes.id, id), isNull(s.otpCodes.consumedAt)));
  if (!row) return { error: "This code request has ended. Start again." };
  if (row.sends >= OTP_MAX_SENDS) return { error: "Too many codes sent. Start again in a few minutes." };
  if (Date.now() - row.createdAt.getTime() < 30_000 && row.sends === 1) return { error: "Please wait 30 seconds before asking for a new code." };
  const code = newCode();
  await db.update(s.otpCodes).set({ codeHash: hash(row.id, code), attempts: 0, sends: row.sends + 1, expiresAt: new Date(Date.now() + OTP_TTL_MS) }).where(eq(s.otpCodes.id, id));
  await deliver(code, to, row.purpose);
  return { demoCode: otpDemoMode() ? code : undefined };
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
