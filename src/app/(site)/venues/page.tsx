import { and, asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { PageHero } from "@/components/ui/PageHero";
import { VenueGuide, type GuideVenue } from "@/components/site/VenueGuide";
import { getEvent } from "@/lib/event";
import { fmtDate, fmtTime24, ymdPk } from "@/lib/utils";

/** Venue guide (SC feedback 29 Oct; names per "description changes recommendation" 14.11.2026). keys: building names in the venue list. */
const GUIDE = [
  { key: "LNMC", keys: ["LNMC", "Medical College"], name: "Liaquat National Medical College", short: "Medical College", x: 20, y: 40, info: "Lecture halls and tutorial rooms in the Medical College building." },
  { key: "Convention Center", keys: ["Convention Center"], name: "Convention Centre", short: "Convention Centre", x: 49, y: 24, info: "Auditorium and Halls A to D. Plenary (Day 1) and debate (Day 2) are in the Auditorium." },
  { key: "College of Nursing", keys: ["College of Nursing"], name: "Liaquat National College of Nursing", short: "College of Nursing", x: 31, y: 63, info: "Lecture halls in the College of Nursing." },
  { key: "BSMT", keys: ["BSMT"], name: "Liaquat National School of Medical Technology", short: "School of Medical Technology", x: 54, y: 53, info: "Lecture halls, tutorial rooms and the Annexure Room of the School of Medical Technology." },
  { key: "Radiology", keys: ["Radiology"], name: "Radiology Tutorial Room", short: "Radiology", x: 84, y: 20, info: "Tutorial room in the Radiology department, main hospital." },
  { key: "RSDC", keys: ["Research & Skills Development Centre"], name: "Research and Skills Development Centre", short: "RSDC", x: 70, y: 55, info: "Skills rooms, animal lab, laparoscopy lab and computer lab." },
];

export const metadata = { title: "Venue Map" };
export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  const ev = await getEvent();
  const venues = await db.select().from(s.venues).where(eq(s.venues.active, true)).orderBy(asc(s.venues.building), asc(s.venues.name));
  const released = !!ev.programmeReleasedAt;
  const sci = released ? await db.select({ title: s.sessions.title, startsAt: s.sessions.startsAt, endsAt: s.sessions.endsAt, venueId: s.sessions.venueId, dept: s.sessions.department })
    .from(s.sessions).where(and(eq(s.sessions.status, "APPROVED"), eq(s.sessions.proposal, true))).orderBy(asc(s.sessions.startsAt)) : [];
  const days = ev.eventDays.map((d) => ({ key: d, label: fmtDate(new Date(`${d}T12:00:00+05:00`), { weekday: "short", day: "numeric", month: "short" }) }));
  const guide: GuideVenue[] = GUIDE.map(({ keys: _k, ...g }) => { const keys = _k;
    const rooms = venues.filter((v) => keys.includes(v.building) && !/foyer|exhibition/i.test(v.name));
    const sessions = Object.fromEntries(days.map((d) => [d.key, sci.filter((x) => rooms.some((r) => r.id === x.venueId) && ymdPk(x.startsAt) === d.key)
      .map((x) => ({ title: x.title, time: `${fmtTime24(x.startsAt)}–${fmtTime24(x.endsAt)}`, room: rooms.find((r) => r.id === x.venueId)!.name, dept: x.dept }))]));
    return { ...g, rooms: [], sessions }; // room details hidden (16 Nov 2026)
  });
  return (
    <>
      <PageHero eyebrow="Find your room" title={<>Venues &amp; <span className="text-grad">campus map</span></>} sub="Every workshop and session room at Liaquat National Hospital, Stadium Road, Karachi." />
      <section id="guide" className="container-x mb-12 scroll-mt-28">
        <p className="eyebrow">Scientific sessions · 29, 30 &amp; 31 January 2027</p>
        <h2 className="mt-3 font-display text-2xl font-bold text-white">Venue guide map</h2>
        <p className="mb-5 mt-1 max-w-2xl text-sm text-slate-400">The symposium venues. Tap a pin to see the venue and, once the programme is released, the sessions held there each day.</p>
        <VenueGuide venues={guide} days={days} released={released} />
      </section>
      {/* issues email 16 Nov 2026 (item 7): only the Venue Guide Map; the room-by-room list is hidden */}
    </>
  );
}
