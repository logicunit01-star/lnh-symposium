// Edge-safe JWT helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "lnh_admin";
export type Claims = { sub: string; name: string; email: string; role: string };

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-dev-secret-change-me");

export async function signToken(c: Claims) {
  return new SignJWT({ name: c.name, email: c.email, role: c.role })
    .setProtectedHeader({ alg: "HS256" }).setSubject(c.sub).setIssuedAt().setExpirationTime("12h").sign(key());
}
export async function verifyToken(token?: string): Promise<Claims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { sub: String(payload.sub), name: String(payload.name), email: String(payload.email), role: String(payload.role) };
  } catch { return null; }
}
