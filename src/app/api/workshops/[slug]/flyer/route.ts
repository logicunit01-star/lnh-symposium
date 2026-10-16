import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { getEvent } from "@/lib/event";
import { seatsTaken } from "@/lib/queries";
import { workshopFlyerPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

/** Public flyer for an approved workshop, generated from its record. */
export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const [row] = await db.select({ w: s.sessions, v: s.venues }).from(s.sessions).leftJoin(s.venues, eq(s.venues.id, s.sessions.venueId))
    .where(and(eq(s.sessions.slug, params.slug), eq(s.sessions.type, "WORKSHOP"), eq(s.sessions.status, "APPROVED")));
  if (!row) return new Response("Not found", { status: 404 });
  const ev = await getEvent();
  const taken = (await seatsTaken())[row.w.id] ?? 0;
  const week = row.w.themeWeek ? ev.themeWeeks[row.w.themeWeek - 1] : null;
  const pdf = await workshopFlyerPdf({
    ...row.w, building: row.v ? `${row.v.building}${row.v.floor ? `, ${row.v.floor} floor` : ""}` : null,
    left: row.w.capacity == null ? null : Math.max(0, row.w.capacity - taken),
    themeLabel: week ? `Theme week ${row.w.themeWeek}: ${week.label}` : null,
  }, ev);
  return new Response(Buffer.from(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${params.slug}-flyer.pdf"`, "cache-control": "no-store" } });
}
