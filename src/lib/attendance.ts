import "server-only";
import type { Staff } from "./auth";
import { can, deptsWith } from "./permissions";

/**
 * Committee and admins (global "attendance" permission) see every department; a focal person sees only the
 * departments where they are the focal person. departments = null means all.
 */
export async function attendanceScope(u: Staff) {
  if (can(u, "attendance")) return { departments: null as string[] | null };
  return { departments: deptsWith(u.depts, "attendance") };
}
