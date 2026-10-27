import { sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { issueOtp, maskPhone, phoneDigits } from "@/lib/otp";

/** "My registrations": send a code to the mobile number. The reply is the same whether or not the number is known. */
export async function POST(req: Request) {
  if (!rateLimit("lookup:" + ipOf(req), 6)) return fail("Too many attempts — please wait a minute.", 429);
  const { phone } = await req.json().catch(() => ({}));
  const digits = phoneDigits(String(phone || ""));
  if (!/^03\d{9}$/.test(digits)) return fail("Use format 03XX-XXXXXXX", 400, { phone: "Use format 03XX-XXXXXXX" });
  const [hit] = await db.select({ email: s.registrations.email }).from(s.registrations)
    .where(sql`regexp_replace(${s.registrations.phone}, '[^0-9]', '', 'g') in (${digits}, ${"92" + digits.slice(1)})`).limit(1);
  const otp = await issueOtp("LOOKUP", digits, hit ? { phone: digits, email: hit.email } : {}, { email: hit?.email ?? null });
  return ok({ otpId: otp.id, sentTo: maskPhone(digits), demoCode: hit ? otp.demoCode : undefined });
}
