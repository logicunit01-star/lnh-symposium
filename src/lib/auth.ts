import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, verifyToken, type Claims } from "./auth-edge";
import { can, deptsWith, homeFor, permsFor, type Membership, type Perm } from "./permissions";

/** A signed-in staff member, read fresh from the database on every request (15 Nov 2026 audit, R1):
 * a role change, a department change or a deactivation takes effect at once, not when the 12-hour sign-in ends. */
export type Staff = Claims & { perms: Perm[]; depts: Membership[] };

const load = cache(async (token: string | undefined): Promise<Staff | null> => {
  const c = await verifyToken(token);
  if (!c) return null;
  const { db, schema: s } = await import("./db");
  const { eq } = await import("drizzle-orm");
  const [u] = await db.select({ name: s.users.name, email: s.users.email, role: s.users.role, active: s.users.active, signedOutAt: s.users.signedOutAt }).from(s.users).where(eq(s.users.id, c.sub));
  if (!u || !u.active) return null;
  if (u.signedOutAt && (c.iat ?? 0) * 1000 < u.signedOutAt.getTime() - 1000) return null; // signed in before a password reset
  const depts = (await db.select({ department: s.userDepartments.department, role: s.userDepartments.role }).from(s.userDepartments).where(eq(s.userDepartments.userId, c.sub))) as Membership[];
  return { ...c, name: u.name, email: u.email, role: u.role, depts, perms: permsFor(u.role, depts) };
});

export async function currentUser(): Promise<Staff | null> {
  return load(cookies().get(COOKIE)?.value);
}
/** For server components / actions: redirect if not signed in or lacking permission. */
export async function requirePerm(p: Perm): Promise<Staff> {
  const u = await currentUser();
  if (!u) redirect("/admin/login");
  if (!can(u, p)) redirect(`${homeFor(u)}?denied=1`);
  return u;
}
/** For route handlers: returns user or null (caller responds 401/403). */
export async function apiUser(p: Perm) {
  const u = await currentUser();
  if (!u || !can(u, p)) return null;
  return u;
}

/** Workshop scoping: committee roles see every department; department staff see the departments where they may submit workshops. */
export async function staffScope(u: Staff) {
  const all = can(u, "workshops.all");
  const departments = all ? [] : deptsWith(u.depts, "workshops.submit");
  return { all, departments, department: all ? null : departments[0] ?? "__none__" };
}
