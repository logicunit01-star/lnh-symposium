import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { Building2, Monitor, Users } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { PageHero } from "@/components/ui/PageHero";
import { CampusMap } from "@/components/CampusMap";
import { VenueGuide, type GuideVenue } from "@/components/site/VenueGuide";
import { getEvent } from "@/lib/event";
import { fmtDate, fmtTime24, ymdPk } from "@/lib/utils";

/** The 5 scientific session venues (SC feedback, 29 Oct 2026). */
const GUIDE = [
  { key: "LNMC", name: "LNMC · Liaquat National Medical College", short: "LNMC", x: 20, y: 40, info: "Lecture halls and tutorial room in the Medical College building." },
  { key: "Convention Center", name: "Convention Centre", short: "Convention Centre", x: 49, y: 24, info: "Auditorium and Halls A to D. Plenary (Day 1) and debate (Day 2) are in the Auditorium." },
  { key: "College of Nursing", name: "Nursing College", short: "Nursing College", x: 31, y: 63, info: "Lecture halls in the College of Nursing." },
  { key: "BSMT", name: "BSMT", short: "BSMT", x: 54, y: 53, info: "Lecture halls and the Annexure Room of the BS Medical Technology building." },
  { key: "Radiology", name: "Radiology Tutorial Room", short: "Radiology", x: 84, y: 20, info: "Tutorial Room-1 in the Radiology department, main hospital." },
];

export const metadata = { title: "Venues & Campus Map" };
export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  const ev = await getEvent();
  const [venues, ws] = await Promise.all([
    db.select().from(s.venues).where(eq(s.venues.active, true)).orderBy(asc(s.venues.building), asc(s.venues.name)),
    db.select({ id: s.sessions.id, slug: s.sessions.slug, title: s.sessions.title, venueId: s.sessions.venueId, startsAt: s.sessions.startsAt, endsAt: s.sessions.endsAt, type: s.sessions.type })
      .from(s.sessions).where(and(eq(s.sessions.status, "APPROVED"), sql`(not ${s.sessions.proposal} or exists (select 1 from event e where e.programme_released_at is not null))`)).orderBy(asc(s.sessions.startsAt)),
  ]);
  const released = !!ev.programmeReleasedAt;
  const sci = released ? await db.select({ title: s.sessions.title, startsAt: s.sessions.startsAt, endsAt: s.sessions.endsAt, venueId: s.sessions.venueId, dept: s.sessions.department })
    .from(s.sessions).where(and(eq(s.sessions.status, "APPROVED"), eq(s.sessions.proposal, true))).orderBy(asc(s.sessions.startsAt)) : [];
  const days = ev.eventDays.map((d) => ({ key: d, label: fmtDate(new Date(`${d}T12:00:00+05:00`), { weekday: "short", day: "numeric", month: "short" }) }));
  const guide: GuideVenue[] = GUIDE.map((g) => {
    const rooms = venues.filter((v) => v.building === g.key && !/foyer|exhibition/i.test(v.name));
    const sessions = Object.fromEntries(days.map((d) => [d.key, sci.filter((x) => rooms.some((r) => r.id === x.venueId) && ymdPk(x.startsAt) === d.key)
      .map((x) => ({ title: x.title, time: `${fmtTime24(x.startsAt)}–${fmtTime24(x.endsAt)}`, room: rooms.find((r) => r.id === x.venueId)!.name, dept: x.dept }))]));
    return { ...g, rooms: rooms.map((r) => ({ name: r.name.replace(/\s*\(.*\)$/, ""), capacity: r.capacity })), sessions };
  });
  return (
    <>
      <PageHero eyebrow="Find your room" title={<>Venues &amp; <span className="text-grad">campus map</span></>} sub="Every workshop and session room at Liaquat National Hospital, Stadium Road, Karachi." />
      <section className="container-x mb-12">
        <p className="eyebrow">Scientific sessions · 29, 30 &amp; 31 January 2027</p>
        <h2 className="mt-3 font-display text-2xl font-bold text-white">Venue guide map</h2>
        <p className="mb-5 mt-1 max-w-2xl text-sm text-slate-400">The five scientific session venues. Tap a pin to see the venue's rooms and, once the programme is released, the sessions held there each day.</p>
        <VenueGuide venues={guide} days={days} released={released} />
      </section>
      <h2 className="container-x mb-4 font-display text-2xl font-bold text-white">All rooms</h2>
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
