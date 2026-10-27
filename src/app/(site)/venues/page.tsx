import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { Building2, Monitor, Users } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { PageHero } from "@/components/ui/PageHero";
import { CampusMap } from "@/components/CampusMap";
import { fmtDate, fmtTime24 } from "@/lib/utils";

export const metadata = { title: "Venues & Campus Map" };
export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  const [venues, ws] = await Promise.all([
    db.select().from(s.venues).where(eq(s.venues.active, true)).orderBy(asc(s.venues.building), asc(s.venues.name)),
    db.select({ id: s.sessions.id, slug: s.sessions.slug, title: s.sessions.title, venueId: s.sessions.venueId, startsAt: s.sessions.startsAt, endsAt: s.sessions.endsAt, type: s.sessions.type })
      .from(s.sessions).where(and(eq(s.sessions.status, "APPROVED"), sql`(not ${s.sessions.proposal} or exists (select 1 from event e where e.programme_released_at is not null))`)).orderBy(asc(s.sessions.startsAt)),
  ]);
  return (
    <>
      <PageHero eyebrow="Find your room" title={<>Venues &amp; <span className="text-grad">campus map</span></>} sub="Every workshop and session room at Liaquat National Hospital, Stadium Road, Karachi." />
      <div className="container-x grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="hud p-3 lg:sticky lg:top-28 lg:self-start">
          <CampusMap dark pins={venues} href={(p) => `#${p.id}`} className="w-full rounded-xl" />
          <p className="mono px-2 pt-2 text-[11px] text-slate-500">Schematic map, not to scale · enter from the main gate on Stadium Road</p>
        </div>
        <ul className="space-y-4">
          {venues.map((v) => {
            const here = ws.filter((w) => w.venueId === v.id);
            return (
              <li key={v.id} id={v.id} className="card scroll-mt-28 p-5 target:ring-2 target:ring-lnh-sky">
                <h2 className="font-display text-xl font-bold text-white">{v.name}</h2>
                <ul className="mono mt-3 grid gap-1.5 text-[12px] text-slate-300 sm:grid-cols-3">
                  <li className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-lnh-sky" />{v.building}{v.floor ? `, ${v.floor}` : ""}</li>
                  <li className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-lnh-sky" />{v.capacity} seats</li>
                  <li className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5 text-lnh-sky" />{v.onlineFacility ?? "No online facility"}</li>
                </ul>
                {v.directions && <p className="mt-2 text-sm text-slate-400">{v.directions}</p>}
                {here.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
                    {here.slice(0, 6).map((w) => (
                      <li key={w.id} className="flex justify-between gap-3"><Link href={w.type === "WORKSHOP" ? `/workshops#${w.slug}` : "/agenda"} className="text-slate-200 hover:text-lnh-sky">{w.title}</Link>
                        <span className="mono shrink-0 text-[11px] text-slate-500">{fmtDate(w.startsAt, { day: "numeric", month: "short" })} · {fmtTime24(w.startsAt)}</span></li>
                    ))}
                    {here.length > 6 && <li className="text-xs text-slate-500">+{here.length - 6} more</li>}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
