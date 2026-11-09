import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { fail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { signedIn } from "@/lib/account";
import { verifyOtp } from "@/lib/otp";

/** Step 2 of sign-up: the code creates the account and signs the visitor in. */
export async function POST(req: Request) {
  if (!rateLimit("verify:" + ipOf(req), 20)) return fail("Too many attempts. Please wait a minute.", 429);
  const { otpId, code } = await req.json().catch(() => ({}));
  if (!otpId || !/^\d{6}$/.test(String(code || "").trim())) return fail("Enter the 6-digit code.");
  const v = await verifyOtp(String(otpId), "SIGNUP", String(code));
  if ("error" in v) return fail(v.error!, 400);
  const d = v.row.payload as any;
  const [exists] = await db.select({ id: s.accounts.id }).from(s.accounts).where(eq(s.accounts.email, d.email));
  if (exists) return fail("An account with this email already exists. Please sign in.", 409);
  const [a] = await db.insert(s.accounts).values({ ...d, lastLoginAt: new Date() }).returning();
  return signedIn(a, { name: `${a.title} ${a.firstName} ${a.lastName}` });
}
