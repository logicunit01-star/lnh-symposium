import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { fail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { signedIn } from "@/lib/account";

export async function POST(req: Request) {
  if (!rateLimit("signin:" + ipOf(req), 15, 5 * 60_000)) return fail("Too many attempts. Try again in a few minutes.", 429);
  const { email, password } = await req.json().catch(() => ({}));
  const [a] = await db.select().from(s.accounts).where(eq(s.accounts.email, String(email || "").trim().toLowerCase()));
  if (a?.lockedUntil && a.lockedUntil > new Date()) return fail("Account locked after too many failed attempts. Try again in 15 minutes, or sign in with a code.", 423);
  if (!a || !(await bcrypt.compare(String(password || ""), a.passwordHash))) {
    if (a) {
      const n = a.failedLogins + 1;
      await db.update(s.accounts).set({ failedLogins: n, lockedUntil: n >= 5 ? new Date(Date.now() + 15 * 60_000) : null }).where(eq(s.accounts.id, a.id));
    }
    return fail("That password is not right. Try again, or sign in with a code.", 401);
  }
  await db.update(s.accounts).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(s.accounts.id, a.id));
  return signedIn(a);
}
