import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { db, schema as s } from "./db";

export const USER_COOKIE = "lnh_user";
const key = () => new TextEncoder().encode((process.env.AUTH_SECRET || "dev-secret-change-me-dev-secret-change-me") + ":account");

export type AccountClaims = { sub: string; name: string; email: string };

export async function signAccount(c: AccountClaims) {
  return new SignJWT({ name: c.name, email: c.email, kind: "account" }).setProtectedHeader({ alg: "HS256" }).setSubject(c.sub).setIssuedAt().setExpirationTime("7d").sign(key());
}
export async function currentAccountClaims(): Promise<AccountClaims | null> {
  const t = cookies().get(USER_COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    return { sub: String(payload.sub), name: String(payload.name), email: String(payload.email) };
  } catch { return null; }
}
export async function currentAccount() {
  const c = await currentAccountClaims();
  if (!c) return null;
  const [a] = await db.select().from(s.accounts).where(eq(s.accounts.id, c.sub));
  return a ?? null;
}
export const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86400 };

const name50 = z.string().trim().min(1, "Required").max(50, "Max 50 characters").regex(/^[\p{L}\p{N} .'-]+$/u, "Letters and numbers only");
export const passwordRule = z.string().min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Add an uppercase letter").regex(/[0-9]/, "Add a number").regex(/[^A-Za-z0-9]/, "Add a special character");

export const signupInput = z.object({
  title: z.enum(["Prof.", "Assoc. Prof.", "Asst. Prof.", "Lecturer", "Dr.", "Mr.", "Ms."]),
  gender: z.enum(["Male", "Female"]),
  firstName: name50,
  lastName: name50,
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().regex(/^03\d{2}-?\d{7}$/, "Use format 03XX-XXXXXXX"),
  pmdcNo: z.string().trim().max(30).optional().or(z.literal("")),
  specialty: z.string().trim().max(80).optional().or(z.literal("")),
  designation: z.string().trim().max(80).optional().or(z.literal("")),
  institution: z.string().trim().min(2, "Required").max(160),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  password: passwordRule,
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });
