import "server-only";
import { eq } from "drizzle-orm";
import { db, schema as s } from "./db";
import type { Claims } from "./auth-edge";

/** The focal person sees only their own department; committee and admins see every department. */
export async function attendanceScope(u: Claims) {
  if (u.role !== "FOCAL_PERSON") return { department: null as string | null };
  const [me] = await db.select({ department: s.users.department }).from(s.users).where(eq(s.users.id, u.sub));
  return { department: me?.department || "__none__" };
}
