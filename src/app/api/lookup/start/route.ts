import { sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { issueOtp, sentToText, phoneDigits, accessCodesAvailable } from "@/lib/otp";

/** "My registrations": the mobile number must belong to a registration (issues sheet 16 Nov 2026: say so if it does not);
 *  the code goes to that registration's email address, and by SMS to the number (23 Nov 2026) when SMS codes are on. */
export async function POST(req: Request) {
  if (!(await rateLimit("lookup:" + ipOf(req), 6))) return fail("Too many attempts — please wait a minute.", 429);
  if (!(await accessCodesAvailable())) return fail("Look-up by code is not available yet. Use your registration number and email instead.", 503);
  const { phone } = await req.json().catch(() => ({}));
  const digits = phoneDigits(String(phone || ""));
  if (!/^03\d{9}$/.test(digits)) return fail("Use format 03XX-XXXXXXX", 400, { phone: "Use format 03XX-XXXXXXX" });
  const [hit] = await db.select({ email: s.registrations.email }).from(s.registrations)
    .where(sql`regexp_replace(${s.registrations.phone}, '[^0-9]', '', 'g') in (${digits}, ${"92" + digits.slice(1)})`).limit(1);
  if (!hit) return fail("No registration was found with this mobile number. Check the number, or use your registration number and email instead.", 404, { phone: "No registration with this number" });
  const otp = await issueOtp("LOOKUP", digits, { email: hit.email, phone: digits }, { email: hit.email });
  return ok({ otpId: otp.id, sentTo: await sentToText({ email: hit.email, phone: digits }), demoCode: otp.demoCode });
}
