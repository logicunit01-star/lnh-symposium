import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { getEvent } from "@/lib/event";
import { sessionFlyerPdf } from "@/lib/pdf";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { SESSION_FORMATS } from "@/lib/scientific";

export const dynamic = "force-dynamic";

/** Scientific session flyer generated from the approved session content. Public only after the HOD's final approval and the programme release;
 *  the committee and the session's department can preview before. */
export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const ses = await db.query.sessions.findFirst({ where: and(eq(s.sessions.slug, params.slug), eq(s.sessions.proposal, true), eq(s.sessions.status, "APPROVED")), with: { people: true, venue: true } });
  if (!ses) return new Response("Not found", { status: 404 });
  const ev = await getEvent();
  if (ses.flyerStatus !== "APPROVED" || !ev.programmeReleasedAt) {
    const u = await currentUser();
    let ok = !!u && can(u.role, "programme");
    if (u && !ok && can(u.role, "dept.flyers")) {
      const [me] = await db.select({ d: s.users.department }).from(s.users).where(eq(s.users.id, u.sub));
      ok = !!me?.d && me.d === ses.department;
    }
    if (!ok) return new Response("This flyer is not published yet.", { status: 404 });
  }
  const pdf = await sessionFlyerPdf({
    slug: ses.slug, title: ses.title, department: ses.department, formatLabel: SESSION_FORMATS[ses.sessionFormat ?? ""] ?? null, startsAt: ses.startsAt, endsAt: ses.endsAt,
    hall: ses.venue?.name.replace(/\s*\(.*\)$/, "") ?? ses.hall, building: ses.venue?.building ?? null, expectedAudience: ses.expectedAudience,
    people: ses.people.filter((p) => p.inviteStatus !== "WITHDRAWN" && p.inviteStatus !== "DECLINED").sort((a, b) => a.order - b.order),
  }, ev);
  return new Response(Buffer.from(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${params.slug}-flyer.pdf"`, "cache-control": "no-store" } });
}
