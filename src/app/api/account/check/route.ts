import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { emailInput } from "@/lib/account";

/** Email-first sign-in: tells the form whether to ask for a password (existing account) or show the short sign-up. */
export async function POST(req: Request) {
  if (!rateLimit("acheck:" + ipOf(req), 20)) return fail("Too many attempts. Please wait a minute.", 429);
  const p = emailInput.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  const [a] = await db.select({ id: s.accounts.id, firstName: s.accounts.firstName }).from(s.accounts).where(eq(s.accounts.email, p.data.email));
  return ok({ exists: !!a, firstName: a?.firstName ?? null });
}
