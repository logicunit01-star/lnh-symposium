import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema as s } from "@/lib/db";
import { COOKIE, signToken } from "@/lib/auth-edge";
import { ipOf, recordFailure, tooManyFailures } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // audit 16 Nov 2026: only failed attempts count (per network address and per login), so a whole office can sign in
  const { email, password } = await req.json().catch(() => ({}));
  const em = String(email || "").toLowerCase().trim(), ipKey = "login-fail:" + ipOf(req), emKey = "login-fail-email:" + em, WIN = 15 * 60_000;
  if (await tooManyFailures(ipKey, 30, WIN)) return NextResponse.json({ error: "Too many failed attempts. Try again in a few minutes." }, { status: 429 });
  if (await tooManyFailures(emKey, 10, WIN)) return NextResponse.json({ error: "Too many failed attempts for this login. Try again in 15 minutes." }, { status: 429 });
  const [u] = await db.select().from(s.users).where(eq(s.users.email, em));
  if (!u || !u.active || !(await bcrypt.compare(String(password || ""), u.passwordHash))) {
    await recordFailure(ipKey, WIN); await recordFailure(emKey, WIN);
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  await db.update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, u.id));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await signToken({ sub: u.id, name: u.name, email: u.email, role: u.role }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600,
  });
  return res;
}
