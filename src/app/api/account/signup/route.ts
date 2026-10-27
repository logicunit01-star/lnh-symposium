import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { signupInput } from "@/lib/account";
import { issueOtp, maskEmail, maskPhone } from "@/lib/otp";

/** Step 1 of sign-up: validate, hold the details as "pending verification" and send a 6-digit code by email and SMS. */
export async function POST(req: Request) {
  if (!rateLimit("signup:" + ipOf(req), 10)) return fail("Too many attempts — please wait a minute.", 429);
  const p = signupInput.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  const { password, confirm, ...d } = p.data;
  const [exists] = await db.select({ id: s.accounts.id }).from(s.accounts).where(eq(s.accounts.email, d.email));
  if (exists) return fail("An account with this email already exists. Please sign in.", 409, { email: "Already registered — sign in instead" });
  const phone = d.phone.replace(/^(\d{4})-?(\d{7})$/, "$1-$2");
  const pending = { ...d, phone, pmdcNo: d.pmdcNo || null, specialty: d.specialty || null, designation: d.designation || null, address: d.address || null, passwordHash: await bcrypt.hash(password, 10) };
  const otp = await issueOtp("SIGNUP", d.email, { email: d.email, phone }, pending);
  return ok({ pending: true, otpId: otp.id, sentTo: { email: maskEmail(d.email), phone: maskPhone(phone) }, demoCode: otp.demoCode });
}
