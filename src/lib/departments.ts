import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { db, schema as s } from "./db";

/** The department list (Admin → Departments) for pickers: active departments, committee entries excluded. */
export async function listDepartments(o: { includeCommittee?: boolean } = {}) {
  const rows = await db.select({ name: s.departments.name }).from(s.departments)
    .where(and(eq(s.departments.active, true), o.includeCommittee ? undefined : ne(s.departments.kind, "COMMITTEE")))
    .orderBy(asc(s.departments.name));
  return rows.map((r) => r.name);
}
/** True when the name is an active department on the list (the database also refuses unknown names). */
export async function isListedDepartment(name: string | null | undefined) {
  if (!name) return false;
  const [d] = await db.select({ active: s.departments.active }).from(s.departments).where(eq(s.departments.name, name));
  return !!d?.active;
}
