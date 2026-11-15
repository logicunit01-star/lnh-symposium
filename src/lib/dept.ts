import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema as s } from "./db";
import { requirePerm, type Staff } from "./auth";
import { DEPT_ROLE_PERMS, deptsWith, type Perm } from "./permissions";

export const DEPT_COOKIE = "lnh_dept";
const DEPT_PERMS: Perm[] = ["dept.abstracts", "dept.sessions", "dept.guests", "dept.flyers"];

/** Departments whose portal the user may open (any department-portal permission), in the order they were linked. */
export const portalDepts = (u: Staff) => [...new Set(u.depts.filter((d) => DEPT_ROLE_PERMS[d.role]?.some((p) => DEPT_PERMS.includes(p))).map((d) => d.department))];

/** The department the user is working on: the one chosen in the department switcher, else their first. */
export function currentDept(u: Staff, p?: Perm) {
  const list = p ? deptsWith(u.depts, p) : portalDepts(u);
  const chosen = cookies().get(DEPT_COOKIE)?.value;
  return list.includes(chosen ?? "") ? chosen! : list[0] ?? null;
}

/** The signed-in department user, the department they are working on (where their role grants p) and its row. */
export async function requireDept(p: Perm) {
  const u = await requirePerm(p);
  const deptName = currentDept(u, p);
  if (!deptName) redirect("/admin/dept?nodept=1");
  const [d] = await db.select().from(s.departments).where(eq(s.departments.name, deptName));
  return { u, dept: d ?? null, deptName };
}

/**
 * For actions on one record (an abstract, a session, a guest): the department comes from the record, not from the
 * department switcher, so a person in several departments never gets an error after switching in another tab
 * (audit 16 Nov 2026). deptName is null when the person has no role granting p in that department.
 */
export async function requireDeptOf(p: Perm, department: string | null | undefined) {
  const u = await requirePerm(p);
  if (!department || !deptsWith(u.depts, p).includes(department)) return { u, dept: null, deptName: null as string | null };
  const [d] = await db.select().from(s.departments).where(eq(s.departments.name, department));
  return { u, dept: d ?? null, deptName: department as string | null };
}
