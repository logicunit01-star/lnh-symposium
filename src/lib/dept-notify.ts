import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "./db";
import { sendTemplate } from "./email";
import type { TemplateKey } from "./email-templates";
import type { MergeVars } from "./email-templates";
import { DEPT_ROLE_PERMS, DEPT_ROLES, type Perm } from "./permissions";

/** Active people of a department whose department role grants permission p (e.g. dept.guests = the Heads). */
export async function deptPeople(department: string, p: Perm) {
  const roles = DEPT_ROLES.filter((r) => DEPT_ROLE_PERMS[r].includes(p));
  return db.select({ email: s.users.email, name: s.users.name }).from(s.userDepartments).innerJoin(s.users, eq(s.users.id, s.userDepartments.userId))
    .where(and(eq(s.userDepartments.department, department), inArray(s.userDepartments.role, roles), eq(s.users.active, true)));
}

/** Email the department's people who handle its scientific sessions (Heads and coordinators) with a template. */
export async function notifyDept(department: string, key: TemplateKey, vars: MergeVars, p: Perm = "dept.sessions") {
  const logins = await deptPeople(department, p);
  for (const l of logins) await sendTemplate(key, l.email, { name: l.name, department, ...vars }, { ref: String(vars.session_name ?? department) });
  return logins.length;
}
