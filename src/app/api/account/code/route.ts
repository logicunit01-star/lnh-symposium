import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { issueOtp, maskEmail, maskPhone, accessCodesAvailable } from "@/lib/otp";

const input = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address"), purpose: z.enum(["SIGNIN", "RESET"]) });

/** Sends a 6-digit code to the account's email and mobile: sign in without a password (SIGNIN) or set a new password (RESET). */
export async function POST(req: Request) {
  if (!rateLimit("acode:" + ipOf(req), 6)) return fail("Too many attempts. Please wait a minute.", 429);
  if (!accessCodesAvailable()) return fail("Sign-in codes are not available yet (email and SMS are not connected). Please use your password, or contact the symposium secretariat.", 503);
  const p = input.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  const [a] = await db.select({ id: s.accounts.id, email: s.accounts.email, phone: s.accounts.phone }).from(s.accounts).where(eq(s.accounts.email, p.data.email));
  if (!a) return fail("No account uses this email. Create one instead.", 404, { email: "No account with this email" });
  const otp = await issueOtp(p.data.purpose, a.email, { email: a.email, phone: a.phone }, { email: a.email, phone: a.phone, accountId: a.id });
  return ok({ otpId: otp.id, sentTo: `${maskPhone(a.phone)} and ${maskEmail(a.email)}`, demoCode: otp.demoCode });
}
