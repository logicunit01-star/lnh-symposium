import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { signupInput, signAccount, USER_COOKIE, cookieOpts } from "@/lib/account";

export async function POST(req: Request) {
  if (!rateLimit("signup:" + ipOf(req), 10)) return fail("Too many attempts — please wait a minute.", 429);
  const p = signupInput.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  const { password, confirm, ...d } = p.data;
  const [exists] = await db.select({ id: s.accounts.id }).from(s.accounts).where(eq(s.accounts.email, d.email));
  if (exists) return fail("An account with this email already exists. Please sign in.", 409, { email: "Already registered — sign in instead" });
  const phone = d.phone.replace(/^(\d{4})-?(\d{7})$/, "$1-$2");
  const [a] = await db.insert(s.accounts).values({
    ...d, phone, pmdcNo: d.pmdcNo || null, specialty: d.specialty || null, designation: d.designation || null, address: d.address || null,
    passwordHash: await bcrypt.hash(password, 10), lastLoginAt: new Date(),
  }).returning();
  const res = NextResponse.json({ ok: true, name: `${a.title} ${a.firstName} ${a.lastName}` });
  res.cookies.set(USER_COOKIE, await signAccount({ sub: a.id, name: `${a.firstName} ${a.lastName}`, email: a.email }), cookieOpts);
  return res;
}
