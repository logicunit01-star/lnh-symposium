import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema as s } from "./db";
import { requirePerm } from "./auth";
import type { Perm } from "./permissions";

/** The signed-in department login and its department row. */
export async function requireDept(p: Perm) {
  const u = await requirePerm(p);
  const [me] = await db.select({ department: s.users.department }).from(s.users).where(eq(s.users.id, u.sub));
  if (!me?.department) redirect("/admin/dept?nodept=1");
  const [d] = await db.select().from(s.departments).where(eq(s.departments.name, me.department));
  return { u, dept: d ?? null, deptName: me.department };
}
