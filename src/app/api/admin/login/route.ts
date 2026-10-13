import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema as s } from "@/lib/db";
import { COOKIE, signToken } from "@/lib/auth-edge";
import { rateLimit, ipOf } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!rateLimit("login:" + ipOf(req), 8, 5 * 60_000)) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  const { email, password } = await req.json().catch(() => ({}));
  const [u] = await db.select().from(s.users).where(eq(s.users.email, String(email || "").toLowerCase().trim()));
  if (!u || !u.active || !(await bcrypt.compare(String(password || ""), u.passwordHash))) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  await db.update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, u.id));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await signToken({ sub: u.id, name: u.name, email: u.email, role: u.role }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600,
  });
  return res;
}
