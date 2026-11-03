import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "./db";
import { sendTemplate } from "./email";
import type { TemplateKey } from "./email-templates";
import type { MergeVars } from "./email-templates";

/** Email every active department (HOD) login of a speciality with a template. */
export async function notifyDept(department: string, key: TemplateKey, vars: MergeVars) {
  const logins = await db.select({ email: s.users.email, name: s.users.name }).from(s.users)
    .where(and(eq(s.users.department, department), eq(s.users.role, "HOD"), eq(s.users.active, true)));
  for (const l of logins) await sendTemplate(key, l.email, { name: l.name, department, ...vars }, { ref: String(vars.session_name ?? department) });
  return logins.length;
}
