import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "./db";

/** Audience: PAID | PENDING | ALL | SESSION (with sessionId) */
export async function audienceRecipients(audience: string, sessionId?: string | null) {
  const base = { regNo: s.registrations.regNo, title: s.registrations.title, firstName: s.registrations.firstName, lastName: s.registrations.lastName, email: s.registrations.email, phone: s.registrations.phone };
  if (audience === "SESSION" && sessionId) {
    return db.select(base).from(s.registrations).innerJoin(s.registrationItems, eq(s.registrationItems.registrationId, s.registrations.id))
      .where(and(eq(s.registrationItems.sessionId, sessionId), inArray(s.registrations.paymentStatus, ["PAID", "WAIVED"])));
  }
  const st = audience === "PENDING" ? ["PENDING"] : audience === "ALL" ? ["PENDING", "PAID", "WAIVED"] : ["PAID", "WAIVED"];
  return db.select(base).from(s.registrations).where(inArray(s.registrations.paymentStatus, st as any));
}
