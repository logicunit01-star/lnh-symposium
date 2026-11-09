import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { passwordRule, signedIn } from "@/lib/account";
import { verifyOtp } from "@/lib/otp";

const input = z.object({ otpId: z.string().min(1), code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"), password: passwordRule });

/** Forgot password: the emailed / SMS code sets a new password and signs the account in. */
export async function POST(req: Request) {
  if (!rateLimit("areset:" + ipOf(req), 20)) return fail("Too many attempts. Please wait a minute.", 429);
  const p = input.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  const v = await verifyOtp(p.data.otpId, "RESET", p.data.code);
  if ("error" in v) return fail(v.error!, 400, { code: v.error! });
  const [a] = await db.update(s.accounts).set({ passwordHash: await bcrypt.hash(p.data.password, 10), failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(s.accounts.email, v.row.target)).returning();
  if (!a) return fail("Account not found.", 404);
  return signedIn(a);
}
