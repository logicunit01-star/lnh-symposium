import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, verifyToken, type Claims } from "./auth-edge";
import { can, type Perm } from "./permissions";

export async function currentUser(): Promise<Claims | null> {
  return verifyToken(cookies().get(COOKIE)?.value);
}
/** For server components / actions: redirect if not signed in or lacking permission. */
export async function requirePerm(p: Perm): Promise<Claims> {
  const u = await currentUser();
  if (!u) redirect("/admin/login");
  if (!can(u.role, p)) redirect("/admin?denied=1");
  return u;
}
/** For route handlers: returns user or null (caller responds 401/403). */
export async function apiUser(p: Perm) {
  const u = await currentUser();
  if (!u || !can(u.role, p)) return null;
  return u;
}
