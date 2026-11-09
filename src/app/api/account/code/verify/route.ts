import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { fail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { signedIn } from "@/lib/account";
import { verifyOtp } from "@/lib/otp";

/** Sign in with a one-time code instead of the password (also clears a lock-out). */
export async function POST(req: Request) {
  if (!rateLimit("acodev:" + ipOf(req), 20)) return fail("Too many attempts. Please wait a minute.", 429);
  const { otpId, code } = await req.json().catch(() => ({}));
  if (!otpId || !/^\d{6}$/.test(String(code || "").trim())) return fail("Enter the 6-digit code.");
  const v = await verifyOtp(String(otpId), "SIGNIN", String(code));
  if ("error" in v) return fail(v.error!, 400);
  const [a] = await db.update(s.accounts).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(s.accounts.email, v.row.target)).returning();
  if (!a) return fail("Account not found.", 404);
  return signedIn(a);
}
