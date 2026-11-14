"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { maybeIssueWorkshopCert, requestWorkshopFeedback } from "@/lib/certificates";
import { attendanceScope } from "@/lib/attendance";

/** N5 (13 Nov): the department focal person confirms who attended. Ticked = verified; unticked = not verified (unless a certificate was issued). */
export async function saveAttendance(sessionId: string, f: FormData) {
  const u = await requirePerm("attendance");
  const scope = await attendanceScope(u);
  const [w] = await db.select().from(s.sessions).where(and(eq(s.sessions.id, sessionId), eq(s.sessions.type, "WORKSHOP")));
  if (!w || (scope.department && w.department !== scope.department)) throw new Error("Workshop not found");
  if (w.startsAt > new Date()) redirect(`/admin/attendance?w=${sessionId}&err=early`);
  const ticked = new Set(f.getAll("present").map(String));
  const items = await db.select({ i: s.registrationItems }).from(s.registrationItems)
    .innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
    .where(and(eq(s.registrationItems.sessionId, sessionId), inArray(s.registrations.paymentStatus, ["PAID", "WAIVED"])));
  const now = new Date();
  let verified = 0, certs = 0;
  for (const { i } of items) {
    if (ticked.has(i.id)) {
      const fresh = !i.verifiedAt;
      if (fresh) { await db.update(s.registrationItems).set({ verifiedAt: now, verifiedBy: u.name, attendedAt: i.attendedAt ?? now }).where(eq(s.registrationItems.id, i.id)); verified++; }
      if (await maybeIssueWorkshopCert(i.id)) certs++;
      else if (fresh) await requestWorkshopFeedback(i.id); // N6: the certificate follows the feedback
    } else if (i.verifiedAt && !i.certNo) {
      await db.update(s.registrationItems).set({ verifiedAt: null, verifiedBy: null }).where(eq(s.registrationItems.id, i.id));
    }
  }
  revalidatePath("/admin/attendance");
  redirect(`/admin/attendance?w=${sessionId}&saved=${verified}&certs=${certs}`);
}
